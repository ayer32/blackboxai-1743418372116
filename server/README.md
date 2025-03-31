# Cricket Tournament Manager API

A comprehensive RESTful API for managing cricket tournaments, teams, players, and matches.

## Features

- User Authentication & Authorization
- Team Management
- Player Management
- Match Management
- Tournament Management
- Real-time Score Updates
- Statistics & Analytics
- Email Notifications

## Tech Stack

- Node.js
- Express.js
- MongoDB
- JWT Authentication
- Nodemailer
- Express Validator

## Prerequisites

- Node.js (>=14.0.0)
- MongoDB
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd cricket-tournament-manager/server
```

2. Install dependencies:
```bash
npm install
```

3. Create a .env file in the server directory and add your configuration:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/cricket-tournament
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=30d
JWT_COOKIE_EXPIRE=30

# Email configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
FROM_NAME=Cricket Tournament Manager
FROM_EMAIL=noreply@cricketmanager.com

# Client URL for CORS
CLIENT_URL=http://localhost:3000
```

4. Seed the database with sample data:
```bash
# Import data
npm run seed

# Delete data
npm run seed:delete
```

5. Start the server:
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## API Documentation

### Authentication Routes
- POST `/api/auth/register` - Register a new user
- POST `/api/auth/login` - Login user
- GET `/api/auth/me` - Get current user
- POST `/api/auth/logout` - Logout user
- PUT `/api/auth/updatedetails` - Update user details
- PUT `/api/auth/updatepassword` - Update password
- POST `/api/auth/forgotpassword` - Forgot password
- PUT `/api/auth/resetpassword/:resettoken` - Reset password

### Team Routes
- GET `/api/teams` - Get all teams
- GET `/api/teams/:id` - Get single team
- POST `/api/teams` - Create new team
- PUT `/api/teams/:id` - Update team
- DELETE `/api/teams/:id` - Delete team
- GET `/api/teams/:id/stats` - Get team statistics
- POST `/api/teams/:id/players` - Add player to team
- DELETE `/api/teams/:id/players/:playerId` - Remove player from team

### Player Routes
- GET `/api/players` - Get all players
- GET `/api/players/:id` - Get single player
- POST `/api/players` - Create new player
- PUT `/api/players/:id` - Update player
- DELETE `/api/players/:id` - Delete player
- GET `/api/players/:id/stats` - Get player statistics
- PUT `/api/players/:id/stats` - Update player statistics

### Match Routes
- GET `/api/matches` - Get all matches
- GET `/api/matches/:id` - Get single match
- POST `/api/matches` - Create new match
- PUT `/api/matches/:id` - Update match
- DELETE `/api/matches/:id` - Delete match
- PUT `/api/matches/:id/score` - Update match score
- GET `/api/matches/:id/stats` - Get match statistics
- GET `/api/matches/live` - Get live matches
- GET `/api/matches/upcoming` - Get upcoming matches
- GET `/api/matches/recent` - Get recent matches

### Tournament Routes
- GET `/api/tournaments` - Get all tournaments
- GET `/api/tournaments/:id` - Get single tournament
- POST `/api/tournaments` - Create new tournament
- PUT `/api/tournaments/:id` - Update tournament
- DELETE `/api/tournaments/:id` - Delete tournament
- POST `/api/tournaments/:id/teams` - Register team for tournament
- PUT `/api/tournaments/:id/teams/:teamId` - Update team registration status
- GET `/api/tournaments/:id/stats` - Get tournament statistics
- GET `/api/tournaments/active` - Get active tournaments
- GET `/api/tournaments/upcoming` - Get upcoming tournaments
- GET `/api/tournaments/registration-open` - Get tournaments with open registration

## Error Handling

The API uses consistent error handling and returns errors in the following format:
```json
{
  "success": false,
  "error": "Error message here"
}
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Protected routes require a valid JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Role-Based Access Control

The API implements role-based access control with three roles:
- Admin: Full access to all features
- Team Manager: Can manage their team and players
- Viewer: Read-only access to public data

## Rate Limiting

The API implements rate limiting to prevent abuse:
- General routes: 100 requests per 10 minutes
- Authentication routes: 5 requests per hour

## Security Features

- JWT Authentication
- Password Hashing
- XSS Protection
- Rate Limiting
- CORS
- Security Headers
- MongoDB Query Sanitization
- Parameter Pollution Protection

## Testing

Run tests using Jest:
```bash
npm test
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.