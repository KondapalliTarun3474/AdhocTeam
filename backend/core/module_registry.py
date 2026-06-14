import importlib
import pkgutil
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple

from fastapi import APIRouter

from core.rbac import Role


HubProvider = Callable[[str, str, Role, str], Dict[str, Any]]


@dataclass(frozen=True)
class CampusModule:
    key: str
    name: str
    status: str
    summary: str
    roles: Tuple[Role, ...]
    router: Optional[APIRouter] = None
    hub_provider: Optional[HubProvider] = None

    def summary_for_role(self, role: Role) -> Dict[str, Any]:
        return {
            "key": self.key,
            "name": self.name,
            "status": self.status,
            "summary": self.summary,
            "roles": [module_role.value for module_role in self.roles],
            "available": role in self.roles or role == Role.ADMIN,
        }


_MODULE_CACHE: Optional[List[CampusModule]] = None


def discover_modules() -> List[CampusModule]:
    global _MODULE_CACHE
    if _MODULE_CACHE is not None:
        return _MODULE_CACHE

    modules_dir = Path(__file__).parents[1] / "modules"
    discovered: List[CampusModule] = []

    for module_info in pkgutil.iter_modules([str(modules_dir)]):
        if module_info.name.startswith("_"):
            continue

        module_path = f"modules.{module_info.name}.module"
        try:
            module = importlib.import_module(module_path)
        except ModuleNotFoundError as error:
            if error.name != module_path:
                raise
            continue

        campus_module = getattr(module, "MODULE", None)
        if isinstance(campus_module, CampusModule):
            discovered.append(campus_module)

    _MODULE_CACHE = sorted(discovered, key=lambda item: item.name)
    return _MODULE_CACHE


def module_summaries_for_role(role: Role) -> List[Dict[str, Any]]:
    return [module.summary_for_role(role) for module in discover_modules()]
