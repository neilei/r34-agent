import aiohttp
import asyncio
import uuid
from typing import Optional, Any
from uagents import Agent, Context, Model, Protocol
from datetime import datetime
from enum import Enum
from uagents.experimental.quota import QuotaProtocol, RateLimit
from uagents_core.models import ErrorMessage
from uagents_core.contrib.protocols.chat import (
    ChatAcknowledgement,
    ChatMessage,
    EndSessionContent,
    TextContent,
    chat_protocol_spec,
)

# The base URL for the rule34-agent API
BASE_URL = "https://rule34-agent.vercel.app"

# Address for an AI agent that can provide structured output
AI_AGENT_ADDRESS = "agent1q0h70caed8ax769shpemapzkyk65uscw4xwk6dc4t3emvp5jdcvqs9xs32y"


# Define the request model for the agent, based on the API's needs
class GraphRequestStructuredOutputPrompt(Model):
    originalText: str
    kinks: list[str] = []


# Define the response model from the agent
class GraphResponse(Model):
    success: bool
    result: Optional[dict] = None
    error: Optional[str] = None


# Models for structured output protocol
class StructuredOutputPrompt(Model):
    prompt: str
    output_schema: dict[str, Any]


class StructuredOutputResponse(Model):
    output: dict[str, Any]


# Health check models
class HealthCheck(Model):
    pass


class HealthStatus(str, Enum):
    HEALTHY = "healthy"
    UNHEALTHY = "unhealthy"


class AgentHealth(Model):
    agent_name: str
    status: HealthStatus


# Create the agent with proper configuration for local hosting
agent = Agent(
    name="rule34_uagent",
    seed="rule34_uagent_seed",
    port=8001,
    endpoint=["http://127.0.0.1:8001/submit"],
)

# Create the main protocol for handling requests with rate limiting
proto = QuotaProtocol(
    storage_reference=agent.storage,
    name="Rule34RequestProtocol",
    version="0.1.0",
    default_rate_limit=RateLimit(window_size_minutes=60, max_requests=30),
)

# Create a new protocol for chat, compatible with ASI-1
chat_protocol = Protocol(spec=chat_protocol_spec)

# Protocol for interacting with a structured output provider (LLM)
struct_output_client_proto = Protocol(
    name="StructuredOutputClientProtocol", version="0.1.0"
)

# Create a new protocol for health checks
health_protocol = QuotaProtocol(
    storage_reference=agent.storage, name="HealthProtocol", version="0.1.0"
)


async def agent_is_healthy(ctx: Context) -> bool:
    """Checks if the rule34-agent API is reachable."""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(BASE_URL, timeout=30) as response:
                if response.status < 400:
                    ctx.logger.info(
                        f"Health check successful: API endpoint is reachable at {BASE_URL} with status {response.status}"
                    )
                    return True
                else:
                    ctx.logger.warning(
                        f"Health check failed: API endpoint at {BASE_URL} returned status {response.status}"
                    )
                    return False
    except asyncio.TimeoutError:
        ctx.logger.error(f"Health check failed: request to {BASE_URL} timed out.")
        return False
    except aiohttp.ClientError as e:
        ctx.logger.error(
            f"Health check failed: could not connect to {BASE_URL}. Error: {e}"
        )
        return False
    except Exception as e:
        ctx.logger.error(f"An unexpected error occurred during health check: {e}")
        return False


@health_protocol.on_message(HealthCheck, replies=AgentHealth)
async def handle_health_check(ctx: Context, sender: str, _msg: HealthCheck):
    """Handles health check requests."""
    ctx.logger.info(f"Received health check from {sender}")
    status = HealthStatus.UNHEALTHY
    try:
        if await agent_is_healthy(ctx):
            status = HealthStatus.HEALTHY
    except Exception as err:
        ctx.logger.error(f"Error during health check: {err}")

    await ctx.send(sender, AgentHealth(agent_name="rule34_uagent", status=status))


@proto.on_message(
    GraphRequestStructuredOutputPrompt, replies={GraphResponse, ErrorMessage}
)
async def handle_request(
    ctx: Context, sender: str, msg: GraphRequestStructuredOutputPrompt
):
    """Handles requests to process text via the rule34-agent API."""
    ctx.logger.info(f"Received request from {sender}")
    try:
        result = await process_rule34_request(msg.originalText, msg.kinks, ctx)
        if result.success:
            ctx.logger.info("Successfully processed request.")
            await ctx.send(sender, result)
        else:
            ctx.logger.error(f"Processing failed: {result.error}")
            await ctx.send(sender, ErrorMessage(error=result.error))
    except Exception as err:
        ctx.logger.error(f"An unexpected error occurred: {err}")
        await ctx.send(sender, ErrorMessage(error=str(err)))


@struct_output_client_proto.on_message(StructuredOutputResponse)
async def handle_structured_output_response(
    ctx: Context, sender: str, msg: StructuredOutputResponse
):
    """Handles the structured response from the AI agent."""
    session_sender = ctx.storage.get(str(ctx.session))
    if session_sender is None:
        ctx.logger.error("Discarding message: no session sender in storage")
        return

    ctx.logger.info(f"Received structured output from {sender}")

    try:
        # The output from the LLM should match our structured request model
        if "<UNKNOWN>" in str(msg.output):
            raise ValueError("LLM could not determine structured output.")

        prompt = GraphRequestStructuredOutputPrompt.parse_obj(msg.output)

        # Now call the main request processing logic
        result = await process_rule34_request(prompt.originalText, prompt.kinks, ctx)

        if result.success and result.result:
            response_text = result.result.get(
                "veniceResponse",
                "Processing was successful, but no rewritten text was returned.",
            )
        else:
            response_text = f"An error occurred: {result.error or 'Unknown error'}"

    except Exception as ex:
        ctx.logger.error(f"Failed to process structured output: {ex}")
        response_text = (
            "Sorry, I couldn't process your request. Please try again later."
        )

    # Send final response back to the original user
    await ctx.send(
        session_sender,
        ChatMessage(
            timestamp=datetime.utcnow(),
            msg_id=uuid.uuid4(),
            content=[
                TextContent(type="text", text=response_text),
                EndSessionContent(type="end-session"),
            ],
        ),
    )


@chat_protocol.on_message(ChatMessage)
async def handle_message(ctx: Context, sender: str, msg: ChatMessage):
    """Handles chat messages, sends them for structuring, and then processes."""
    ctx.logger.info(f"Received chat message from {sender}")

    # Store sender for later response
    ctx.storage.set(str(ctx.session), sender)

    # Send acknowledgement for receiving the message
    await ctx.send(
        sender,
        ChatAcknowledgement(timestamp=datetime.now(), acknowledged_msg_id=msg.msg_id),
    )

    # Collect up all the text chunks
    text = ""
    for item in msg.content:
        if isinstance(item, TextContent):
            text += item.text

    if not text:
        ctx.logger.warning("Received chat message with no text content.")
        response_text = "Please provide text for me to process."
        await ctx.send(
            sender,
            ChatMessage(
                timestamp=datetime.utcnow(),
                msg_id=uuid.uuid4(),
                content=[TextContent(type="text", text=response_text)],
            ),
        )
        return

    # Send the text to the AI agent for structuring
    try:
        ctx.logger.info(f"Sending text to AI agent for structuring: '{text}'")
        await ctx.send(
            AI_AGENT_ADDRESS,
            StructuredOutputPrompt(
                prompt=text,
                output_schema=GraphRequestStructuredOutputPrompt.schema(),
            ),
        )
    except Exception as ex:
        ctx.logger.error(f"Failed to send message to structuring agent: {ex}")
        await ctx.send(
            sender,
            ChatMessage(
                timestamp=datetime.utcnow(),
                msg_id=uuid.uuid4(),
                content=[
                    TextContent(
                        type="text",
                        text="Sorry, I couldn't connect to the content analysis service. Please try again later.",
                    )
                ],
            ),
        )


@chat_protocol.on_message(ChatAcknowledgement)
async def handle_chat_ack(ctx: Context, sender: str, msg: ChatAcknowledgement):
    """Handles chat acknowledgements."""
    ctx.logger.info(f"Received ack from {sender} for message {msg.acknowledged_msg_id}")


print(f"Your agent's address is: {agent.address}")


async def process_rule34_request(
    original_text: str, kinks: list[str], ctx: Context
) -> GraphResponse:
    """Common function to process rule34 requests to avoid code duplication."""
    session_id = str(uuid.uuid4())
    ctx.logger.info(f"Processing rule34 request. Session ID: {session_id}")

    api_url = f"{BASE_URL}/api/graph"
    payload = {
        "originalText": original_text,
        "kinks": kinks,
        "sessionId": session_id,
    }

    try:
        async with aiohttp.ClientSession() as session:
            # Make the POST request to the external API with increased timeout
            async with session.post(
                api_url, json=payload, timeout=300
            ) as response:  # Increased to 5 minutes
                response.raise_for_status()  # Raise an exception for bad status codes
                data = await response.json()

        ctx.logger.info(f"Successfully called API for session {session_id}.")
        return GraphResponse(
            success=data.get("success"),
            result=data.get("result"),
            error=None,
        )

    except (aiohttp.ClientError, asyncio.TimeoutError) as ex:
        # Handle network or HTTP errors
        error_message = f"API request failed: {ex}"
        ctx.logger.error(error_message)
        return GraphResponse(success=False, result=None, error=error_message)
    except Exception as ex:
        # Handle other unexpected errors
        error_message = f"An unexpected error occurred: {ex}"
        ctx.logger.error(error_message)
        return GraphResponse(success=False, result=None, error=error_message)


@agent.on_event("startup")
async def startup_handler(ctx: Context):
    """Startup handler with debug dump and health check."""
    ctx.logger.info("=== UAGENT STARTUP DEBUG DUMP ===")
    ctx.logger.info("Agent Name: rule34_uagent")
    ctx.logger.info(f"Agent Address: {agent.address}")
    ctx.logger.info(f"Base URL: {BASE_URL}")
    ctx.logger.info(f"AI Agent Address: {AI_AGENT_ADDRESS}")
    ctx.logger.info("---")
    ctx.logger.info("Performing startup health check...")
    if await agent_is_healthy(ctx):
        ctx.logger.info("✅ Agent is healthy: Rule34 API is reachable.")
    else:
        ctx.logger.warning("❌ Agent is unhealthy: Rule34 API is not reachable.")
    ctx.logger.info("---")

    # Broadcast a test message to confirm agent is running
    test_message = "Rule34-uAgent is online and ready for tasks."
    ctx.logger.info(f"Broadcasting startup test message: '{test_message}'")
    try:
        await ctx.broadcast(
            "agent1q2yhtknlq8z55n2gan5zth3d5448zvj20jwtrch4l6n0f545a6c38xfqg3p",
            message=test_message,
        )
        ctx.logger.info("Startup message broadcasted successfully!")
    except Exception as ex:
        ctx.logger.error(f"Failed to broadcast startup message: {ex}")

    ctx.logger.info("=== STARTUP COMPLETE ===")


# Include the protocols in the agent
agent.include(proto, publish_manifest=True)
agent.include(chat_protocol, publish_manifest=True)
agent.include(health_protocol, publish_manifest=True)
agent.include(struct_output_client_proto, publish_manifest=True)


if __name__ == "__main__":
    agent.run()
