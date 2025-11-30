class CursorManager {
    constructor() {
        this.cursors = new Map();
        this.cursorsContainer = document.getElementById('cursors-container');
        
        if (!this.cursorsContainer) {
            this.createCursorsContainer();
        }
        
        this.initializeCursorManager();
    }

    createCursorsContainer() {
        this.cursorsContainer = document.createElement('div');
        this.cursorsContainer.id = 'cursors-container';
        this.cursorsContainer.className = 'cursors-container';
        
        const editorContainer = document.querySelector('.editor-container');
        if (editorContainer) {
            editorContainer.appendChild(this.cursorsContainer);
        } else {
            document.body.appendChild(this.cursorsContainer);
        }
    }

    initializeCursorManager() {
        console.log('🎯 Cursor manager initialized');
    }

    updateCursor(data) {
        this.removeCursor(data.userId);

        const cursorElement = this.createCursorElement(data);
        this.cursorsContainer.appendChild(cursorElement);
        this.cursors.set(data.userId, cursorElement);
    }

    createCursorElement(data) {
        const cursorElement = document.createElement('div');
        cursorElement.className = 'remote-cursor';
        cursorElement.id = `cursor-${data.userId}`;
        cursorElement.style.backgroundColor = data.user.color;
        cursorElement.style.left = `${data.cursor.x}px`;
        cursorElement.style.top = `${data.cursor.y}px`;
        cursorElement.style.height = `${data.cursor.height}px`;

        const label = document.createElement('div');
        label.className = 'cursor-label';
        label.textContent = data.user.name;
        label.style.backgroundColor = data.user.color;
        cursorElement.appendChild(label);

        return cursorElement;
    }

    removeCursor(userId) {
        const cursorElement = this.cursors.get(userId);
        if (cursorElement) {
            cursorElement.remove();
            this.cursors.delete(userId);
        }
    }

    clearAllCursors() {
        this.cursors.forEach((cursorElement, userId) => {
            cursorElement.remove();
        });
        this.cursors.clear();
    }

    updateCursorPosition(userId, position) {
        const cursorElement = this.cursors.get(userId);
        if (cursorElement) {
            cursorElement.style.left = `${position.x}px`;
            cursorElement.style.top = `${position.y}px`;
            cursorElement.style.height = `${position.height}px`;
        }
    }

    // Method to handle editor scroll (cursors need to move with content)
    handleEditorScroll(scrollTop, scrollLeft) {
        // This would be implemented if we need to adjust cursor positions on scroll
        // For now, cursors are positioned absolutely relative to the editor
    }

    // Method to show/hide cursors
    setCursorsVisible(visible) {
        this.cursorsContainer.style.display = visible ? 'block' : 'none';
    }

    // Get all active cursor user IDs
    getActiveUserIds() {
        return Array.from(this.cursors.keys());
    }

    // Check if a user has an active cursor
    hasCursor(userId) {
        return this.cursors.has(userId);
    }
}