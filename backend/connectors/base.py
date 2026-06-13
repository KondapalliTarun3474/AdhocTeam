from abc import ABC, abstractmethod
from typing import List, Any
from pydantic import BaseModel

class BaseConnector(ABC):
    @abstractmethod
    def fetch(self, config: dict) -> Any:
        pass
    
    @abstractmethod
    def parse(self, raw_data: Any) -> List[BaseModel]:
        pass
    
    @abstractmethod
    def sync(self, config: dict) -> bool:
        pass
