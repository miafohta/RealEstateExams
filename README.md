RealEstateExams – Full-Stack Exam Platform

RealEstateExams is a full-stack web application designed to simulate California Real Estate licensing exams, allowing users to practice under realistic conditions, track progress, and review performance.

I built this project end-to-end to demonstrate production-level backend architecture, secure authentication, and frontend–backend integration.

== Key Capabilities ==

Secure user authentication and session management

Timed practice exams with dynamic question selection

Automatic scoring with pass/fail evaluation

Exam attempt history and answer review

RESTful API designed for scalable frontend consumption

== Tech Stack ==

Backend: Python, FastAPI, SQLAlchemy, PostgreSQL, Alembic, JWT
Frontend: Next.js, React, TypeScript

== Engineering Focus ==

Clean API design with clear separation of concerns

Strong data modeling for exams, attempts, and answers

Input validation and security best practices

Scalable architecture ready for admin tools and analytics

Why This Project

This project reflects how I approach real-world systems: designing maintainable APIs, modeling complex workflows, and building software that’s ready to evolve beyond an MVP.

backend/
├── app/
│   ├── main.py              # FastAPI entry point
│   ├── db.py                # Database session & engine
│   ├── models/              # SQLAlchemy models
│   ├── schemas/             # Pydantic schemas
│   ├── auth/                # Authentication & JWT logic
│   ├── services/            # Business logic (exam flow)
│   └── routers/             # API routes
├── alembic/                 # Database migrations
├── requirements.txt
└── README.md

- API Highlights

POST /auth/signup – Create a new user

POST /auth/login – Authenticate user

POST /attempts/start – Start an exam attempt

POST /attempts/answer – Submit an answer

POST /attempts/submit – Submit exam

GET /me/attempts – View attempt history

- Exam Logic

Questions are selected dynamically per attempt

Supports balanced question distribution

Passing score is configurable

Attempts store:

Selected questions

User answers

Final score

Pass / fail result

- Security Considerations

JWT-based authentication

Input validation via Pydantic schemas

ORM-level SQL injection protection

CORS configuration for frontend access

- Future Improvements

Admin dashboard for managing questions

Category-based exams

Analytics & performance insights

Bookmark / favorite questions

Mobile-friendly UI

Payment & subscription support