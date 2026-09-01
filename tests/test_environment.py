"""Environment and dependency verification tests for T02."""

import pytest

def test_python_version():
    import sys
    assert sys.version_info >= (3, 10), "Python 3.10+ required"

def test_dependencies_import():
    import fastapi
    import uvicorn
    import sqlalchemy
    import pydantic
    import pandas
    import openpyxl
    import sklearn
    import httpx
    import dotenv

    assert fastapi.__version__ == "0.115.6"
    assert uvicorn.__version__ == "0.34.0"
    assert sqlalchemy.__version__ == "2.0.36"
    assert pydantic.__version__.startswith("2.")
    assert pandas.__version__ == "2.2.3"
    assert sklearn.__version__ == "1.6.0"
    assert httpx.__version__ == "0.28.1"
