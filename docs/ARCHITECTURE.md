# SP-Manager Architecture

Frontend: React + Vite
Backend: Node.js + Express
API: REST-style JSON endpoints

The current test build keeps data in server memory so it can be tested immediately without database setup.

Production phase should replace the in-memory repository with a real database and add authentication, audit trail, transaction handling, printing, backup/restore and full business rules.
