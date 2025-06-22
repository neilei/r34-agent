# Rule34 U-Agent

This directory contains a `uagents` agent that acts as a client for the `rule34-agent` API. It uses [Poetry](https://python-poetry.org/) for dependency management.

## Setup

1.  **Install Poetry:**
    If you don't have Poetry, follow the [official installation guide](https://python-poetry.org/docs/#installation).

2.  **Install Dependencies:**
    Poetry will automatically create a virtual environment in the `.venv` directory and install all the required packages.

    ```bash
    poetry install
    ```

## Running the Agent

To run the agent, you can use Poetry's `run` command, which executes the command within the project's virtual environment.

```bash
poetry run python main.py
```

Alternatively, you can activate the virtual environment first and then run the script:

```bash
poetry shell
python main.py
```

The agent will start and print its address to the console. You can then send requests to this agent from other uagents. 