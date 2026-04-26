# ABOUTME: Package metadata. __version__ resolves from installed package metadata.
# ABOUTME: Railway sets RAILWAY_GIT_COMMIT_SHA at runtime — use that for build-identity in /version.

from importlib.metadata import PackageNotFoundError, version as _pkg_version

try:
    __version__ = _pkg_version("nove")
except PackageNotFoundError:
    __version__ = "0.0.0+dev"
