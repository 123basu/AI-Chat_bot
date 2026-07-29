import re

NAME = "weather"
DESCRIPTION = "Get current weather for a city"

MOCK_DATA = {
    "bangalore": {"city": "Bangalore", "temperature": "27°C", "condition": "Cloudy"},
    "delhi": {"city": "Delhi", "temperature": "35°C", "condition": "Sunny"},
    "mumbai": {"city": "Mumbai", "temperature": "32°C", "condition": "Humid"},
    "hyderabad": {"city": "Hyderabad", "temperature": "30°C", "condition": "Clear"},
}

WEATHER_PATTERNS = [
    re.compile(r"(?:weather|temperature|how\s+(?:hot|cold|warm|cool)\s+(?:is|'s))\s+(?:in|of|at)\s+(\w+)", re.IGNORECASE),
    re.compile(r"(?:what('s| is)\s+(?:the\s+)?(?:weather|temperature))\s+(?:in|of|at|like\s+in)\s+(\w+)", re.IGNORECASE),
]

CITY_KEYWORDS = re.compile(
    r"\b(bangalore|delhi|mumbai|hyderabad)\b", re.IGNORECASE
)


def match(message: str) -> dict | None:
    for pattern in WEATHER_PATTERNS:
        m = pattern.search(message)
        if m:
            for group in m.groups():
                if group:
                    return {"city": group.strip()}

    m = CITY_KEYWORDS.search(message)
    if m:
        return {"city": m.group(1)}

    return None


def execute(city: str) -> dict:
    key = city.strip().lower()
    entry = MOCK_DATA.get(key)
    if entry:
        return dict(entry)
    return {"city": city, "error": "City not found"}
