const mongoose = require('mongoose');
const dotenv = require('dotenv');
const colors = require('colors');

// Load env vars
dotenv.config();

// Load models
const User = require('./models/User');
const Team = require('./models/Team');
const Player = require('./models/Player');
const Tournament = require('./models/Tournament');
const Match = require('./models/Match');

// Connect to DB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Sample data
const users = [
  {
    username: 'admin',
    email: 'admin@example.com',
    password: 'Admin@123',
    role: 'Admin'
  },
  {
    username: 'teammanager1',
    email: 'manager1@example.com',
    password: 'Manager@123',
    role: 'TeamManager'
  },
  {
    username: 'viewer1',
    email: 'viewer1@example.com',
    password: 'Viewer@123',
    role: 'Viewer'
  }
];

const teams = [
  {
    name: 'Royal Challengers',
    shortName: 'RCB',
    manager: {
      name: 'John Doe',
      contact: 'manager1@example.com'
    },
    coach: {
      name: 'Mike Johnson',
      specialization: 'Batting'
    },
    homeGround: 'M. Chinnaswamy Stadium, Bangalore',
    stats: {
      matchesPlayed: 0,
      matchesWon: 0,
      matchesLost: 0,
      matchesDrawn: 0,
      points: 0,
      netRunRate: 0
    }
  },
  {
    name: 'Super Kings',
    shortName: 'CSK',
    manager: {
      name: 'Jane Smith',
      contact: 'manager2@example.com'
    },
    coach: {
      name: 'Steve Williams',
      specialization: 'All-Round'
    },
    homeGround: 'M. A. Chidambaram Stadium, Chennai',
    stats: {
      matchesPlayed: 0,
      matchesWon: 0,
      matchesLost: 0,
      matchesDrawn: 0,
      points: 0,
      netRunRate: 0
    }
  }
];

const players = [
  {
    name: 'Virat Kohli',
    dateOfBirth: '1988-11-05',
    playerType: 'Batsman',
    battingStyle: 'Right Handed',
    bowlingStyle: 'Right Arm Medium',
    jerseyNumber: 18,
    stats: {
      batting: {
        matches: 0,
        innings: 0,
        runs: 0,
        highestScore: 0,
        average: 0,
        strikeRate: 0
      },
      bowling: {
        matches: 0,
        innings: 0,
        wickets: 0,
        economy: 0,
        average: 0
      }
    }
  },
  {
    name: 'MS Dhoni',
    dateOfBirth: '1981-07-07',
    playerType: 'Wicket-Keeper',
    battingStyle: 'Right Handed',
    bowlingStyle: 'None',
    jerseyNumber: 7,
    stats: {
      batting: {
        matches: 0,
        innings: 0,
        runs: 0,
        highestScore: 0,
        average: 0,
        strikeRate: 0
      },
      bowling: {
        matches: 0,
        innings: 0,
        wickets: 0,
        economy: 0,
        average: 0
      }
    }
  }
];

const tournaments = [
  {
    name: 'Premier Cricket League 2023',
    shortName: 'PCL23',
    season: '2023',
    format: 'T20',
    overs: 20,
    startDate: new Date('2023-09-01'),
    endDate: new Date('2023-10-15'),
    registrationDeadline: new Date('2023-08-15'),
    venues: [
      {
        ground: 'M. Chinnaswamy Stadium',
        city: 'Bangalore',
        country: 'India',
        capacity: 40000
      },
      {
        ground: 'M. A. Chidambaram Stadium',
        city: 'Chennai',
        country: 'India',
        capacity: 50000
      }
    ],
    pointsSystem: {
      win: 2,
      loss: 0,
      tie: 1,
      noResult: 1
    },
    status: 'Registration',
    organizer: {
      name: 'Cricket Board',
      contact: {
        email: 'admin@example.com',
        phone: '+1234567890'
      }
    }
  }
];

// Import data into DB
const importData = async () => {
  try {
    // Clear existing data
    await User.deleteMany();
    await Team.deleteMany();
    await Player.deleteMany();
    await Tournament.deleteMany();
    await Match.deleteMany();

    // Create users
    const createdUsers = await User.create(users);
    console.log('Users imported...'.green.inverse);

    // Create teams and assign manager IDs
    const teamManager = createdUsers.find(user => user.role === 'TeamManager');
    teams[0].manager.userId = teamManager._id;
    const createdTeams = await Team.create(teams);
    console.log('Teams imported...'.green.inverse);

    // Create players and assign to teams
    players[0].team = createdTeams[0]._id; // Assign Kohli to RCB
    players[1].team = createdTeams[1]._id; // Assign Dhoni to CSK
    const createdPlayers = await Player.create(players);
    console.log('Players imported...'.green.inverse);

    // Update teams with player references
    await Team.findByIdAndUpdate(createdTeams[0]._id, {
      $push: { players: createdPlayers[0]._id }
    });
    await Team.findByIdAndUpdate(createdTeams[1]._id, {
      $push: { players: createdPlayers[1]._id }
    });

    // Create tournaments
    tournaments[0].teams = [
      { team: createdTeams[0]._id, status: 'Approved' },
      { team: createdTeams[1]._id, status: 'Approved' }
    ];
    await Tournament.create(tournaments);
    console.log('Tournaments imported...'.green.inverse);

    console.log('Data imported successfully!'.green.bold);
    process.exit();
  } catch (error) {
    console.error(`${error}`.red.bold);
    process.exit(1);
  }
};

// Delete data from DB
const deleteData = async () => {
  try {
    await User.deleteMany();
    await Team.deleteMany();
    await Player.deleteMany();
    await Tournament.deleteMany();
    await Match.deleteMany();

    console.log('Data destroyed successfully!'.red.bold);
    process.exit();
  } catch (error) {
    console.error(`${error}`.red.bold);
    process.exit(1);
  }
};

// Check command line argument
if (process.argv[2] === '-i') {
  importData();
} else if (process.argv[2] === '-d') {
  deleteData();
} else {
  console.log('Please provide proper command line argument:'.yellow);
  console.log('  -i : Import data'.yellow);
  console.log('  -d : Delete data'.yellow);
  process.exit();
}