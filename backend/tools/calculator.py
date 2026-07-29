import ast
import operator
import re

NAME = "calculator"
DESCRIPTION = "Evaluate mathematical expressions (supports +, -, *, /, %, **, parentheses)"

SAFE_OPS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.Pow: operator.pow,
    ast.Mod: operator.mod,
    ast.USub: operator.neg,
    ast.UAdd: operator.pos,
}

ALLOWED_CONSTANTS = {"pi": 3.141592653589793, "e": 2.718281828459045}

CALC_PATTERNS = [
    re.compile(r"what\s*(?:is|'s)\s*([\d\s+\-*/%()**.×÷^]+)", re.IGNORECASE),
    re.compile(r"(?:calculate|compute|evaluate|solve|find)\s*([\d\s+\-*/%()**.×÷^]+)", re.IGNORECASE),
]


def _safe_eval(expr: str) -> float:
    expr = expr.replace("×", "*").replace("÷", "/").replace("^", "**")
    expr = expr.strip()

    tree = ast.parse(expr, mode="eval")

    def _eval(node):
        if isinstance(node, ast.Expression):
            return _eval(node.body)
        if isinstance(node, ast.Constant):
            return node.value
        if isinstance(node, ast.BinOp):
            left = _eval(node.left)
            right = _eval(node.right)
            op_type = type(node.op)
            if op_type not in SAFE_OPS:
                raise ValueError(f"Unsupported binary operator: {op_type}")
            return SAFE_OPS[op_type](left, right)
        if isinstance(node, ast.UnaryOp):
            operand = _eval(node.operand)
            op_type = type(node.op)
            if op_type not in SAFE_OPS:
                raise ValueError(f"Unsupported unary operator: {op_type}")
            return SAFE_OPS[op_type](operand)
        if isinstance(node, ast.Name):
            if node.id in ALLOWED_CONSTANTS:
                return ALLOWED_CONSTANTS[node.id]
            raise ValueError(f"Unknown name: {node.id}")
        raise ValueError(f"Unsupported syntax: {type(node).__name__}")

    result = _eval(tree)
    if isinstance(result, float) and result == int(result):
        result = int(result)
    return result


def match(message: str) -> dict | None:
    for pattern in CALC_PATTERNS:
        m = pattern.search(message)
        if m:
            expr = m.group(1).strip().rstrip("?.")
            if expr:
                return {"expression": expr}

    cleaned = message.strip().replace(" ", "").rstrip("?.")
    if re.match(r"^[\d+\-*/%().×÷^*]+$", cleaned):
        if re.search(r"\d", cleaned):
            return {"expression": cleaned}

    return None


def execute(expression: str) -> dict:
    try:
        result = _safe_eval(expression)
        return {"expression": expression, "result": result}
    except Exception as e:
        return {"expression": expression, "error": str(e)}
