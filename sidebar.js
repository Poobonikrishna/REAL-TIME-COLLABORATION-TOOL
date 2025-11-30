class SidebarManager {
    constructor(socket, currentDocumentId) {
        this.socket = socket;
        this.currentDocumentId = currentDocumentId;
        this.documents = [];
        
        this.initializeSidebar();
    }

    initializeSidebar() {
        this.bindSidebarEvents();
        this.loadDocuments();
    }

    bindSidebarEvents() {
        // Document creation
        const newDocBtn = document.getElementById('new-doc-btn');
        const loadDocsBtn = document.getElementById('load-docs-btn');
        
        if (newDocBtn) {
            newDocBtn.addEventListener('click', () => this.createNewDocument());
        }
        
        if (loadDocsBtn) {
            loadDocsBtn.addEventListener('click', () => this.loadDocuments());
        }

        // Share functionality
        const shareBtn = document.getElementById('share-btn');
        const copyLinkBtn = document.getElementById('copy-link-btn');
        const closeShareBtn = document.getElementById('close-share-btn');
        
        if (shareBtn) {
            shareBtn.addEventListener('click', () => this.showShareModal());
        }
        
        if (copyLinkBtn) {
            copyLinkBtn.addEventListener('click', () => this.copyShareLink());
        }
        
        if (closeShareBtn) {
            closeShareBtn.addEventListener('click', () => this.hideShareModal());
        }

        // Document title changes
        const docTitle = document.getElementById('document-title');
        if (docTitle) {
            docTitle.addEventListener('change', (e) => this.handleTitleChange(e.target.value));
            docTitle.addEventListener('blur', (e) => this.handleTitleChange(e.target.value));
        }

        // Save button
        const saveBtn = document.getElementById('save-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveDocument());
        }
    }

    async loadDocuments() {
        try {
            const response = await fetch('/api/documents');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            this.documents = result.data || result;
            this.renderDocumentsList();
            this.renderDocumentSelect();
        } catch (error) {
            console.error('Failed to load documents:', error);
            this.showNotification('Failed to load documents', 'error');
        }
    }

    renderDocumentsList() {
        const list = document.getElementById('documents-list');
        if (!list) return;

        list.innerHTML = '';

        if (this.documents.length === 0) {
            list.innerHTML = '<div class="no-documents">No documents yet. Create one!</div>';
            return;
        }

        this.documents.forEach(doc => {
            const item = document.createElement('div');
            item.className = 'document-item';
            if (doc.id === this.currentDocumentId) {
                item.classList.add('active');
            }
            
            const title = Helpers.escapeHtml(doc.title);
            const userCount = doc.userCount || 0;
            const updatedAt = new Date(doc.updatedAt).toLocaleDateString();
            
            item.innerHTML = `
                <div class="doc-title">${title}</div>
                <div class="doc-meta">
                    <span>${userCount} user${userCount !== 1 ? 's' : ''}</span>
                    <span>${updatedAt}</span>
                </div>
            `;

            item.addEventListener('click', () => {
                this.switchDocument(doc.id);
            });

            list.appendChild(item);
        });
    }

    renderDocumentSelect() {
        const select = document.getElementById('document-select');
        if (!select) return;

        select.innerHTML = '';

        this.documents.forEach(doc => {
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = doc.title;
            if (doc.id === this.currentDocumentId) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    }

    async createNewDocument() {
        const title = prompt('Enter document title:');
        if (title && title.trim()) {
            try {
                const response = await fetch('/api/documents', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ 
                        title: title.trim(),
                        content: '' 
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const result = await response.json();
                const document = result.data || result;
                
                this.currentDocumentId = document.id;
                this.switchDocument(document.id);
                this.showNotification('Document created successfully!', 'success');
            } catch (error) {
                console.error('Failed to create document:', error);
                this.showNotification('Failed to create document', 'error');
            }
        }
    }

    switchDocument(documentId) {
        this.currentDocumentId = documentId;
        
        // Update URL without page reload
        const newUrl = `${window.location.pathname}?doc=${documentId}`;
        window.history.pushState({}, '', newUrl);
        
        // Emit join document event
        if (this.socket && this.socket.connected) {
            const userData = window.collabPlatform ? window.collabPlatform.getUserData() : { name: 'User' };
            this.socket.emit('join-document', {
                documentId: documentId,
                user: userData
            });
        }

        this.loadDocuments();
    }

    showShareModal() {
        const shareLink = `${window.location.origin}?doc=${this.currentDocumentId}`;
        const shareLinkInput = document.getElementById('share-link');
        const shareModal = document.getElementById('share-modal');
        
        if (shareLinkInput && shareModal) {
            shareLinkInput.value = shareLink;
            shareModal.style.display = 'flex';
        }
    }

    hideShareModal() {
        const shareModal = document.getElementById('share-modal');
        if (shareModal) {
            shareModal.style.display = 'none';
        }
    }

    copyShareLink() {
        const shareLink = document.getElementById('share-link');
        if (!shareLink) return;

        shareLink.select();
        shareLink.setSelectionRange(0, 99999);
        
        try {
            navigator.clipboard.writeText(shareLink.value);
            this.showNotification('Link copied to clipboard!', 'success');
        } catch (err) {
            // Fallback for older browsers
            document.execCommand('copy');
            this.showNotification('Link copied to clipboard!', 'success');
        }
    }

    handleTitleChange(newTitle) {
        if (newTitle && newTitle.trim() && this.socket && this.socket.connected) {
            this.socket.emit('title-change', newTitle.trim());
        }
    }

    saveDocument() {
        // In a real application, this would save to a database
        // For now, we'll just show a notification
        this.showNotification('Document saved!', 'success');
    }

    updateUsersList(users) {
        const usersList = document.getElementById('users-list');
        if (!usersList) return;

        usersList.innerHTML = '';

        if (!users || users.length === 0) {
            usersList.innerHTML = '<div class="no-users">No users online</div>';
            return;
        }

        users.forEach(user => {
            const userElement = document.createElement('div');
            userElement.className = 'user-item';
            
            const isCurrentUser = user.id === this.socket?.id;
            const userName = Helpers.escapeHtml(user.name);
            
            userElement.innerHTML = `
                <div class="user-avatar" style="background-color: ${user.color}">
                    ${userName.charAt(0).toUpperCase()}
                </div>
                <span>${userName}${isCurrentUser ? ' (You)' : ''}</span>
                ${user.isTyping ? '<div class="typing-dot"></div>' : ''}
                <div class="user-status ${user.isTyping ? 'typing' : 'idle'}"></div>
            `;

            usersList.appendChild(userElement);
        });

        // Update user count in status bar
        const userCountElement = document.getElementById('user-count');
        if (userCountElement) {
            userCountElement.textContent = `${users.length} user${users.length !== 1 ? 's' : ''} online`;
        }
    }

    showNotification(message, type = 'info', duration = 3000) {
        if (window.collabPlatform && window.collabPlatform.showNotification) {
            window.collabPlatform.showNotification(message, type, duration);
        } else {
            // Fallback notification
            alert(`${type.toUpperCase()}: ${message}`);
        }
    }

    // Getters
    getCurrentDocumentId() {
        return this.currentDocumentId;
    }

    setCurrentDocumentId(documentId) {
        this.currentDocumentId = documentId;
        this.loadDocuments();
    }
}