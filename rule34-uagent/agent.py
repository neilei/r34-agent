import aiohttp
import asyncio
import uuid
from typing import Optional
from uagents import Agent, Context, Model, Protocol
from datetime import datetime
from uagents_core.contrib.protocols.chat import (
    ChatAcknowledgement,
    ChatMessage,
    EndSessionContent,
    TextContent,
    chat_protocol_spec,
)

# The base URL for the rule34-agent API
BASE_URL = "https://rule34-agent.vercel.app"


# Define the request model for the agent, based on the API's needs
class GraphRequest(Model):
    originalText: str
    kinks: list[str] = []


# Define the response model from the agent
class GraphResponse(Model):
    success: bool
    result: Optional[dict] = None
    error: Optional[str] = None


# Create the agent with proper configuration for local hosting
agent = Agent(
    name="rule34_uagent",
    seed="rule34_uagent_seed",
    port=8001,
    endpoint=["http://127.0.0.1:8001/submit"],
)

# Create a new protocol for chat, compatible with ASI-1
chat_protocol = Protocol(spec=chat_protocol_spec)


@chat_protocol.on_message(ChatMessage)
async def handle_chat_message(ctx: Context, sender: str, msg: ChatMessage):
    """Handles chat messages for rule34 text processing."""
    ctx.logger.info(f"Received chat message from {sender}")

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
    else:
        # Use existing logic to process the request via the API
        # Kinks are not supported in this simple chat interface.
        result = await process_rule34_request(text, [], ctx)
        ctx.logger.info(f"Response from rule34-agent: {result}")
        if result.success and result.result:
            response_text = result.result.get(
                "veniceResponse",
                "Processing was successful, but no rewritten text was returned.",
            )
        else:
            response_text = f"An error occurred: {result.error or 'Unknown error'}"

    # Send the response back to the user
    await ctx.send(
        sender,
        ChatMessage(
            timestamp=datetime.utcnow(),
            msg_id=uuid.uuid4(),
            content=[
                TextContent(type="text", text=response_text),
                EndSessionContent(
                    type="end-session"
                ),  # Signal that this interaction is complete
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
    """Startup handler with debug dump and hello world test."""
    ctx.logger.info("=== RULE34 UAGENT STARTUP DEBUG DUMP ===")
    ctx.logger.info(f"Agent Name: {agent.name}")
    ctx.logger.info(f"Agent Address: {agent.address}")
    ctx.logger.info(f"Agent Port: {agent._port}")
    ctx.logger.info(f"Agent Endpoints: {agent._endpoints}")
    ctx.logger.info(f"Base URL: {BASE_URL}")
    ctx.logger.info("=== STARTUP COMPLETE ===")

    # Send a hello world test message for the GraphRequest handler
    graph_test_message = "prebaked-test-query"
    ctx.logger.info(
        f"Sending hello world test message for GraphRequest: {graph_test_message}"
    )

    try:
        await ctx.send(
            agent.address, GraphRequest(originalText=graph_test_message, kinks=[])
        )
        ctx.logger.info("GraphRequest test message sent successfully!")
    except Exception as ex:
        ctx.logger.error(f"Failed to send GraphRequest test message: {ex}")

    # Send a hello world test message for the ChatMessage handler
    chat_test_message = "This is a startup test message for the ASI-1 chat handler."
    ctx.logger.info(
        f"Sending hello world test message for ChatMessage: {chat_test_message}"
    )
    try:
        await ctx.send(
            agent.address,
            ChatMessage(
                timestamp=datetime.utcnow(),
                msg_id=uuid.uuid4(),
                content=[TextContent(type="text", text=chat_test_message)],
            ),
        )
        ctx.logger.info("ChatMessage test message sent successfully!")
    except Exception as ex:
        ctx.logger.error(f"Failed to send ChatMessage test message: {ex}")


# Include the chat protocol in the agent
agent.include(chat_protocol, publish_manifest=True)


@agent.on_message(model=GraphRequest, replies=GraphResponse)
async def handle_graph_request(ctx: Context, sender: str, msg: GraphRequest):
    """Handles requests to process text via the rule34-agent API."""
    ctx.logger.info(f"Received graph request from {sender}")

    result = await process_rule34_request(msg.originalText, msg.kinks, ctx)

    ctx.logger.info(f"Response from rule34-agent: {result}")
    ctx.logger.info(f"Sending graph response to {sender}")
    await ctx.send(sender, result)


if __name__ == "__main__":
    agent.run()
