class UserListManager {
    constructor(socket) {
        this.socket = socket;
        this.users = new Map();
        this.typingUsers = new Map();
        
        this.initializeUserList();
    }

    initializeUserList() {
        this.renderUserList();
        this.setupTypingIndicators();
    }

    addUser(userData) {
        this.users.set(userData.id, userData);
        this.renderUserList();
        this.showUserJoinedNotification(userData);
    }

    removeUser(userId) {
        const user = this.users.get(userId);
        this.users.delete(userId);
        this.typingUsers.delete(userId);
        this.renderUserList();
        this.updateTypingIndicators();
        
        if (user) {
            this.showUserLeftNotification(user);
        }
    }

    updateUser(userId, updates) {
        const user = this.users.get(userId);
        if (user) {
            Object.assign(user, updates);
            this.renderUserList();
        }
    }

    setUserTyping(userId, isTyping) {
        if (isTyping) {
            this.typingUsers.set(userId, this.users.get(userId));
        } else {
            this.typingUsers.delete(userId);
        }
        this.updateTypingIndicators();
        this.renderUserList();
    }

    renderUserList() {
        const usersList = document.getElementById('users-list');
        if (!usersList) return;

        usersList.innerHTML = '';

        if (this.users.size === 0) {
            usersList.innerHTML = '<div class="no-users">No users online</div>';
            return;
        }

        // Convert Map to Array and sort by join time or name
        const usersArray = Array.from(this.users.values());
        
        usersArray.forEach(user => {
            const userElement = this.createUserElement(user);
            usersList.appendChild(userElement);
        });

        // Update user count
        this.updateUserCount();
    }

    createUserElement(user) {
        const userElement = document.createElement('div');
        userElement.className = 'user-item';
        userElement.id = `user-${user.id}`;
        
        const isCurrentUser = user.id === this.socket?.id;
        const isTyping = this.typingUsers.has(user.id);
        const userName = Helpers.escapeHtml(user.name);

        userElement.innerHTML = `
            <div class="user-avatar" style="background-color: ${user.color}">
                ${userName.charAt(0).toUpperCase()}
            </div>
            <span class="user-name">${userName}${isCurrentUser ? ' (You)' : ''}</span>
            ${isTyping ? '<div class="typing-dot"></div>' : ''}
            <div class="user-status ${isTyping ? 'typing' : 'idle'}"></div>
        `;

        // Add hover tooltip
        userElement.title = `${userName}${isCurrentUser ? ' (You)' : ''}${isTyping ? ' - typing...' : ''}`;

        return userElement;
    }

    updateUserCount() {
        const userCountElement = document.getElementById('user-count');
        if (userCountElement) {
            userCountElement.textContent = `${this.users.size} user${this.users.size !== 1 ? 's' : ''} online`;
        }
    }

    setupTypingIndicators() {
        // Ensure typing indicators container exists
        let indicatorsContainer = document.getElementById('typing-indicators');
        if (!indicatorsContainer) {
            indicatorsContainer = document.createElement('div');
            indicatorsContainer.id = 'typing-indicators';
            indicatorsContainer.className = 'typing-indicators';
            
            const statusBar = document.querySelector('.status-bar');
            if (statusBar) {
                statusBar.prepend(indicatorsContainer);
            }
        }
    }

    updateTypingIndicators() {
        const indicatorsContainer = document.getElementById('typing-indicators');
        if (!indicatorsContainer) return;

        indicatorsContainer.innerHTML = '';

        if (this.typingUsers.size === 0) return;

        // Show typing indicators for users who are typing
        this.typingUsers.forEach((user, userId) => {
            if (userId !== this.socket?.id) { // Don't show indicator for current user
                const indicator = document.createElement('div');
                indicator.className = 'typing-indicator';
                indicator.id = `typing-${userId}`;
                indicator.textContent = `${user.name} is typing...`;
                indicator.style.backgroundColor = user.color;
                indicatorsContainer.appendChild(indicator);
            }
        });
    }

    showUserJoinedNotification(user) {
        this.showNotification(`👤 ${user.name} joined the document`, 'info', 3000);
    }

    showUserLeftNotification(user) {
        this.showNotification(`👋 ${user.name} left the document`, 'info', 3000);
    }

    showNotification(message, type = 'info', duration = 3000) {
        // Use the main platform's notification system if available
        if (window.collabPlatform && window.collabPlatform.showNotification) {
            window.collabPlatform.showNotification(message, type, duration);
        }
    }

    // Get all users
    getUsers() {
        return Array.from(this.users.values());
    }

    // Get user by ID
    getUser(userId) {
        return this.users.get(userId);
    }

    // Check if user exists
    hasUser(userId) {
        return this.users.has(userId);
    }

    // Get number of users
    getUserCount() {
        return this.users.size;
    }

    // Get typing users
    getTypingUsers() {
        return Array.from(this.typingUsers.values());
    }
}