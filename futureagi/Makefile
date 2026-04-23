# Makefile for core-backend

.PHONY: help test test-unit test-integration test-watch test-shell clean lint format mypy

help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "Tests (uses bin/test):"
	@echo "  test            Run all tests"
	@echo "  test-unit       Run unit tests"
	@echo "  test-integration Run integration tests"
	@echo "  test-watch      Watch mode"
	@echo "  test-shell      Open test shell"
	@echo ""
	@echo "Code Quality:"
	@echo "  lint            Run linters"
	@echo "  format          Format code"
	@echo "  mypy            Type checking"
	@echo ""
	@echo "Or use bin/test directly for more options:"
	@echo "  bin/test help"

# Tests - delegate to bin/test
test:
	@bin/test

test-unit:
	@bin/test unit

test-integration:
	@bin/test integration

test-watch:
	@bin/test watch

test-shell:
	@bin/test shell

# Code Quality
lint:
	@ruff check . --fix
	@black --check .

format:
	@black .
	@isort .

mypy:
	@./bin/check_mypy.sh

# Cleanup
clean:
	@rm -rf htmlcov/ .pytest_cache/ .coverage test-reports/
	@find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@bin/test down 2>/dev/null || true
