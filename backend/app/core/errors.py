"""Domain errors and the handlers that turn them into clean HTTP responses.

Services raise ``NotFoundError`` / ``ConflictError`` and know nothing about HTTP;
this module is the only place that maps them to status codes.
"""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class AppError(Exception):
    status_code = 500

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class BadRequestError(AppError):
    status_code = 400


class NotFoundError(AppError):
    status_code = 404


class ConflictError(AppError):
    status_code = 409


def _clean_message(message: str) -> str:
    # Pydantic prefixes messages from our own validators with "Value error, ".
    return message.removeprefix("Value error, ")


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def handle_app_error(_request: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code, content={"detail": exc.message}
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(
        _request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        # One consistent shape the UI can map straight onto form fields.
        errors = [
            {
                "field": ".".join(str(part) for part in error["loc"][1:]),
                "message": _clean_message(error["msg"]),
            }
            for error in exc.errors()
        ]
        return JSONResponse(
            status_code=422, content={"detail": "Validation failed", "errors": errors}
        )
