"""
Langfuse Tracer - Monitor AI Agent Interactions
"""
from langfuse import Langfuse
# from langfuse.decorators import observe, langfuse_context
from typing import Optional, Dict, Any, List
from datetime import datetime
import functools
import json

from app.config import settings


# Initialize Langfuse client
_langfuse_client: Optional[Langfuse] = None


def get_langfuse() -> Optional[Langfuse]:
    """Get or create Langfuse client"""
    global _langfuse_client
    
    if _langfuse_client is None:
        if settings.LANGFUSE_PUBLIC_KEY and settings.LANGFUSE_SECRET_KEY:
            try:
                _langfuse_client = Langfuse(
                    public_key=settings.LANGFUSE_PUBLIC_KEY,
                    secret_key=settings.LANGFUSE_SECRET_KEY,
                    host=settings.LANGFUSE_HOST
                )
                print("✅ Langfuse observability initialized")
            except Exception as e:
                print(f"⚠️ Failed to initialize Langfuse: {e}")
                _langfuse_client = None
        else:
            print("⚠️ Langfuse keys not configured - observability disabled")
    
    return _langfuse_client


def create_trace(
    name: str,
    user_id: Optional[str] = None,
    session_id: Optional[str] = None,
    metadata: Optional[Dict] = None,
    tags: Optional[List[str]] = None
):
    """Create a new trace for tracking agent interactions"""
    langfuse = get_langfuse()
    
    if langfuse is None:
        return None
    
    try:
        trace = langfuse.trace(
            name=name,
            user_id=user_id,
            session_id=session_id,
            metadata=metadata or {},
            tags=tags or []
        )
        return trace
    except Exception as e:
        print(f"⚠️ Failed to create trace: {e}")
        return None


class TracedAgent:
    """
    Wrapper class to add observability to any agent.
    Tracks all agent interactions, LLM calls, and tool usage.
    """
    
    def __init__(self, agent_name: str, agent_instance: Any):
        self.agent_name = agent_name
        self.agent = agent_instance
        self.langfuse = get_langfuse()
    
    def create_span(self, trace, name: str, input_data: Any = None):
        """Create a span within a trace"""
        if trace is None:
            return None
        
        try:
            span = trace.span(
                name=name,
                input=input_data
            )
            return span
        except:
            return None
    
    def end_span(self, span, output_data: Any = None, level: str = "DEFAULT"):
        """End a span with output"""
        if span is None:
            return
        
        try:
            span.end(
                output=output_data,
                level=level  # "DEBUG", "DEFAULT", "WARNING", "ERROR"
            )
        except:
            pass
    
    def log_llm_call(
        self,
        trace,
        model: str,
        prompt: str,
        response: str,
        tokens_input: int = 0,
        tokens_output: int = 0,
        cost: float = 0.0,
        duration_ms: int = 0
    ):
        """Log an LLM call"""
        if trace is None:
            return
        
        try:
            trace.generation(
                name=f"{self.agent_name}_llm_call",
                model=model,
                input=prompt,
                output=response,
                usage={
                    "input": tokens_input,
                    "output": tokens_output,
                    "total": tokens_input + tokens_output
                },
                metadata={
                    "cost": cost,
                    "duration_ms": duration_ms
                }
            )
        except:
            pass
    
    def log_event(self, trace, name: str, data: Any = None):
        """Log an event"""
        if trace is None:
            return
        
        try:
            trace.event(
                name=name,
                input=data
            )
        except:
            pass


def trace_agent_call(agent_name: str):
    """
    Decorator to trace agent method calls.
    Usage: @trace_agent_call("MedicineAgent")
    """
    def decorator(func):
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            langfuse = get_langfuse()
            
            if langfuse is None:
                return await func(*args, **kwargs)
            
            # Create trace
            trace = langfuse.trace(
                name=f"{agent_name}.{func.__name__}",
                metadata={
                    "agent": agent_name,
                    "method": func.__name__,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
            
            # Create span for this call
            span = trace.span(
                name=func.__name__,
                input={"args": str(args[1:]), "kwargs": str(kwargs)}
            )
            
            try:
                # Execute function
                result = await func(*args, **kwargs)
                
                # End span with success
                span.end(
                    output=result if isinstance(result, (dict, str, list)) else str(result),
                    level="DEFAULT"
                )
                
                return result
                
            except Exception as e:
                # End span with error
                span.end(
                    output={"error": str(e)},
                    level="ERROR"
                )
                raise
            finally:
                # Flush to ensure data is sent
                langfuse.flush()
        
        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            langfuse = get_langfuse()
            
            if langfuse is None:
                return func(*args, **kwargs)
            
            trace = langfuse.trace(
                name=f"{agent_name}.{func.__name__}",
                metadata={
                    "agent": agent_name,
                    "method": func.__name__
                }
            )
            
            span = trace.span(
                name=func.__name__,
                input={"args": str(args[1:]), "kwargs": str(kwargs)}
            )
            
            try:
                result = func(*args, **kwargs)
                span.end(output=result if isinstance(result, (dict, str, list)) else str(result))
                return result
            except Exception as e:
                span.end(output={"error": str(e)}, level="ERROR")
                raise
            finally:
                langfuse.flush()
        
        # Return appropriate wrapper based on function type
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper
    
    return decorator


def flush_traces():
    """Flush all pending traces to Langfuse"""
    langfuse = get_langfuse()
    if langfuse:
        langfuse.flush()