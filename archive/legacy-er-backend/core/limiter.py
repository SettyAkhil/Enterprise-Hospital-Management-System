"""No-op stand-in for Flask-Limiter -- this backend is a single-hospital dev
instance, not a public-facing multi-tenant deployment, so rate limiting
(and the Redis dependency it needs in the reference app) isn't needed here."""


class _NoopLimiter:
    def limit(self, *_args, **_kwargs):
        def decorator(view):
            return view
        return decorator


limiter = _NoopLimiter()
