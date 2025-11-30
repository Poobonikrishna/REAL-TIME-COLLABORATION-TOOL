class UserManager {
  constructor() {
    this.users = new Map();
    this.userActivity = new Map();
  }

  addUser(socketId, documentId, userData) {
    const user = {
      ...userData,
      documentId,
      connectedAt: new Date(),
      lastActivity: new Date()
    };
    
    this.users.set(socketId, user);
    this.userActivity.set(socketId, {
      joinTime: new Date(),
      lastAction: new Date(),
      actionCount: 0
    });

    return user;
  }

  getUser(socketId) {
    return this.users.get(socketId);
  }

  removeUser(socketId) {
    const user = this.users.get(socketId);
    if (user) {
      this.userActivity.delete(socketId);
    }
    return this.users.delete(socketId);
  }

  getUsersInDocument(documentId) {
    return Array.from(this.users.values())
      .filter(user => user.documentId === documentId)
      .map(user => ({
        id: user.id,
        name: user.name,
        color: user.color,
        isTyping: user.isTyping,
        cursor: user.cursor,
        joinedAt: user.joinedAt
      }))
      .sort((a, b) => new Date(a.joinedAt) - new Date(b.joinedAt));
  }

  updateUser(socketId, updates) {
    const user = this.users.get(socketId);
    if (user) {
      Object.assign(user, updates, { lastActivity: new Date() });
      
      // Update activity tracking
      const activity = this.userActivity.get(socketId);
      if (activity) {
        activity.lastAction = new Date();
        activity.actionCount++;
      }
      
      return true;
    }
    return false;
  }

  getUserCount() {
    return this.users.size;
  }

  getDocumentUserCount(documentId) {
    return Array.from(this.users.values())
      .filter(user => user.documentId === documentId)
      .length;
  }

  // Find user by name (case insensitive)
  findUserByName(name, documentId = null) {
    const searchName = name.toLowerCase();
    return Array.from(this.users.values())
      .filter(user => 
        user.name.toLowerCase().includes(searchName) &&
        (!documentId || user.documentId === documentId)
      );
  }

  // Get user activity statistics
  getUserActivity(socketId) {
    return this.userActivity.get(socketId);
  }

  // Get all users with their activity data
  getAllUsersWithActivity() {
    return Array.from(this.users.values()).map(user => {
      const activity = this.userActivity.get(user.id);
      return {
        ...user,
        activity: activity ? {
          joinTime: activity.joinTime,
          lastAction: activity.lastAction,
          actionCount: activity.actionCount,
          sessionDuration: Date.now() - activity.joinTime.getTime()
        } : null
      };
    });
  }

  // Clean up inactive users (for future use with proper session management)
  cleanupInactiveUsers(maxInactiveMinutes = 30) {
    const cutoffTime = new Date(Date.now() - (maxInactiveMinutes * 60 * 1000));
    let cleanedCount = 0;

    for (const [socketId, user] of this.users.entries()) {
      if (user.lastActivity < cutoffTime) {
        this.users.delete(socketId);
        this.userActivity.delete(socketId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} inactive users`);
    }

    return cleanedCount;
  }

  // Update user's document (when they switch documents)
  updateUserDocument(socketId, newDocumentId) {
    const user = this.users.get(socketId);
    if (user) {
      const oldDocumentId = user.documentId;
      user.documentId = newDocumentId;
      user.lastActivity = new Date();
      return { success: true, oldDocumentId, newDocumentId };
    }
    return { success: false };
  }
}

module.exports = UserManager;