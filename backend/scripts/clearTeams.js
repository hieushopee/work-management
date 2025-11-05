import { connectDatabase } from '../config/database.js';
import { Team } from '../models/team.model.js';

const clearTeams = async () => {
  try {
    await connectDatabase();
    
    const teams = await Team.find();
    
    if (teams.length > 0) {
      await Team.deleteMany({});
      console.log('✅ All teams cleared from database');
    } else {
      console.log('ℹ️ No teams found in database');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing teams:', error);
    process.exit(1);
  }
};

clearTeams();











