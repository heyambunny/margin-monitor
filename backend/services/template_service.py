from pathlib import Path
from jinja2 import Environment, FileSystemLoader

BASE_DIR = Path(__file__).resolve().parent.parent.parent
TEMPLATE_DIR = BASE_DIR / "templates"

env = Environment(loader=FileSystemLoader(TEMPLATE_DIR))

def render_invoice_email(template_name: str, context: dict) -> str:
    template = env.get_template(template_name)
    return template.render(**context)
