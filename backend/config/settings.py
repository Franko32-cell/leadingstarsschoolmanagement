from dotenv import load_dotenv
load_dotenv()

from pathlib import Path
from datetime import timedelta
import os
import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent

# ── Security ───────────────────────────────────────────────────

DEBUG = os.getenv("DEBUG", "False") == "True"

# In DEBUG, fall back to an insecure key for convenience.
# In production, fail loudly instead of silently running with a
# guessable, hardcoded SECRET_KEY if the env var is missing.
if DEBUG:
    SECRET_KEY = os.getenv("SECRET_KEY", "unsafe-secret-key")
else:
    SECRET_KEY = os.environ["SECRET_KEY"]

configured_hosts = {
    host.strip()
    for host in os.getenv("ALLOWED_HOSTS", "").split(",")
    if host.strip()
}
ALLOWED_HOSTS = sorted(
    configured_hosts
    | {".onrender.com", ".netlify.app", "localhost", "127.0.0.1", "testserver"}
)


# ── Installed Apps ─────────────────────────────────────────────

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    'rest_framework',
    'corsheaders',
    'drf_yasg',

    'cloudinary',
    'cloudinary_storage',

    'axes',

    'apps.accounts',
    'apps.students',
    'apps.teachers',
    'apps.classes',
    'apps.subjects',
    'apps.attendance',
    'apps.results',
    'apps.fees.apps.FeesConfig',
    'apps.announcements',
    'apps.admissions',
    'apps.ai',
    'apps.audit',
    'apps.accounting',
    'apps.elearning',
]


# ── Middleware ─────────────────────────────────────────────────

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'axes.middleware.AxesMiddleware',
]


ROOT_URLCONF = 'config.urls'


# ── Templates ──────────────────────────────────────────────────

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]


WSGI_APPLICATION = 'config.wsgi.application'


# ── School Term ────────────────────────────────────────────────

CURRENT_TERM = "term3"
CURRENT_YEAR = 2026


# ── Database ───────────────────────────────────────────────────
# Reads DATABASE_URL env variable (set on Render)
# Falls back to local SQLite for development

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'db.sqlite3'}")
DATABASES = {
    'default': dj_database_url.config(
        default=DATABASE_URL,
        conn_max_age=600,
        ssl_require=not DEBUG and not DATABASE_URL.startswith("sqlite:"),
    )
}


# ── Password Validation ────────────────────────────────────────

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]


# ── Internationalization ───────────────────────────────────────

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True


# ── Static Files ───────────────────────────────────────────────

STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")
static_dir = BASE_DIR / "static"
STATICFILES_DIRS = [static_dir] if static_dir.exists() else []

# NOTE: Django 5.1+ removed STATICFILES_STORAGE / DEFAULT_FILE_STORAGE; the
# STORAGES dict (defined after the Cloudinary block below) replaces them.


# ── Cloudinary / Media ─────────────────────────────────────────

CLOUDINARY_CLOUD_NAME = os.environ.get("CLOUDINARY_CLOUD_NAME", "")
CLOUDINARY_API_KEY    = os.environ.get("CLOUDINARY_API_KEY", "")
CLOUDINARY_API_SECRET = os.environ.get("CLOUDINARY_API_SECRET", "")

if CLOUDINARY_CLOUD_NAME:
    import cloudinary

    cloudinary.config(
        cloud_name=CLOUDINARY_CLOUD_NAME,
        api_key=CLOUDINARY_API_KEY,
        api_secret=CLOUDINARY_API_SECRET,
        secure=True,
    )

    CLOUDINARY_STORAGE = {
        "CLOUD_NAME": CLOUDINARY_CLOUD_NAME,
        "API_KEY":    CLOUDINARY_API_KEY,
        "API_SECRET": CLOUDINARY_API_SECRET,
    }

    # Raw storage accepts PDFs / docs / zips (lesson attachments, student
    # submissions, WhatsApp PDFs) — the image storage rejects non-images.
    _DEFAULT_STORAGE_BACKEND = "cloudinary_storage.storage.RawMediaCloudinaryStorage"
    MEDIA_URL = f"https://res.cloudinary.com/{CLOUDINARY_CLOUD_NAME}/raw/upload/"

else:
    _DEFAULT_STORAGE_BACKEND = "django.core.files.storage.FileSystemStorage"
    MEDIA_URL  = "/media/"
    MEDIA_ROOT = BASE_DIR / "media"

STORAGES = {
    "default": {"BACKEND": _DEFAULT_STORAGE_BACKEND},
    # Plain whitenoise storage (no manifest) — identical to what was
    # effectively running before, because STATICFILES_STORAGE is ignored on
    # Django 5.2. Avoids "missing manifest entry" 500s.
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedStaticFilesStorage"},
}


# ── Termii SMS ─────────────────────────────────────────────────

TERMII_API_KEY   = os.environ.get("TERMII_API_KEY", "")
TERMII_SENDER_ID = os.environ.get("TERMII_SENDER_ID", "LEADSTARS")
TERMII_WHATSAPP_DEVICE_ID = os.environ.get("TERMII_WHATSAPP_DEVICE_ID", "")
TERMII_WHATSAPP_REPORT_TEMPLATE_ID = os.environ.get("TERMII_WHATSAPP_REPORT_TEMPLATE_ID", "")
TERMII_WHATSAPP_BILL_TEMPLATE_ID = os.environ.get("TERMII_WHATSAPP_BILL_TEMPLATE_ID", "")
TERMII_WHATSAPP_RECEIPT_TEMPLATE_ID = os.environ.get("TERMII_WHATSAPP_RECEIPT_TEMPLATE_ID", "")


# ── Paystack ───────────────────────────────────────────────────
# Required to verify webhook signatures and to confirm student-initiated
# payments server-side. Set PAYSTACK_SECRET_KEY on Render.
PAYSTACK_SECRET_KEY = os.environ.get("PAYSTACK_SECRET_KEY", "")


# ── CORS ───────────────────────────────────────────────────────
# In development (DEBUG=True), allow all origins
# In production, only allow the Netlify frontend

if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
else:
    CORS_ALLOW_ALL_ORIGINS = False
    CORS_ALLOWED_ORIGINS = [
        origin.strip()
        for origin in os.getenv("CORS_ALLOWED_ORIGINS", "").split(",")
        if origin.strip()
    ]

CORS_EXPOSE_HEADERS = ["Content-Disposition"]

CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
]


# ── Auth ───────────────────────────────────────────────────────

AUTH_USER_MODEL = 'accounts.User'

AUTHENTICATION_BACKENDS = [
    "axes.backends.AxesBackend",   # must be listed first
    "django.contrib.auth.backends.ModelBackend",
]

# django-axes: suspend account after 3 failed login attempts.
# Locked by username only (not IP) so the account stays suspended
# regardless of which device/network is used, and so a distributed
# attacker guessing many usernames from one IP can't dodge the lock
# by spreading attempts across IPs.
# AXES_COOLOFF_TIME = None means no auto-unlock — the account stays
# suspended until an admin resets it (see LoginView / management command).
AXES_FAILURE_LIMIT = 3
AXES_LOCKOUT_PARAMETERS = ["username"]
AXES_COOLOFF_TIME = None
AXES_RESET_ON_SUCCESS = True


# ── Django REST Framework ──────────────────────────────────────

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "api.authentication.ActiveJWTAuthentication",
    ),
    # Secure by default: every endpoint requires a logged-in user unless it
    # explicitly opts out (login, refresh, register, health, webhook).
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.ScopedRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "login": "5/min",
        "register": "3/min",
    },
}


# ── JWT Settings ───────────────────────────────────────────────

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME":  timedelta(hours=1),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
    "AUTH_HEADER_TYPES":      ("Bearer",),
}


# ── Security Headers ───────────────────────────────────────────

X_FRAME_OPTIONS = "SAMEORIGIN"
SECURE_CROSS_ORIGIN_OPENER_POLICY = None

# Enable these in production
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_CONTENT_TYPE_NOSNIFF = True


# ── Logging ────────────────────────────────────────────────────

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO' if not DEBUG else 'DEBUG',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO' if not DEBUG else 'DEBUG',
            'propagate': False,
        },
    },
}
