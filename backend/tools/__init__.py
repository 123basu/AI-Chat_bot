from . import calculator
from . import weather

REGISTRY = [
    calculator,
    weather,
]


def route_tool(message: str) -> dict | None:
    for tool in REGISTRY:
        params = tool.match(message)
        if params is not None:
            result = tool.execute(**params)
            return {"tool": tool.NAME, "result": result}
    return None
