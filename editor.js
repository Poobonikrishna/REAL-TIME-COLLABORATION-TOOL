class EditorManager {
    constructor(socket, documentId) {
        this.socket = socket;
        this.documentId = documentId;
        this.editor = document.getElementById('editor');
        this.isTyping = false;
        this.typingTimeout = null;
        this.lastContent = '';
        
        this.initializeEditor();
    }

    initializeEditor() {
        if (!this.editor) {
            console.error('Editor element not found');
            return;
        }

        // Set up editor event listeners with debouncing
        this.editor.addEventListener('input', Helpers.debounce((e) => this.handleInput(e), 100));
        this.editor.addEventListener('keydown', () => this.handleTypingStart());
        this.editor.addEventListener('keyup', () => this.handleTypingEnd());
        this.editor.addEventListener('click', () => this.updateCursorPosition());
        this.editor.addEventListener('keyup', () => this.updateCursorPosition());
        this.editor.addEventListener('scroll', () => this.updateCursorPosition());

        // Set placeholder if empty
        if (!this.editor.innerHTML.trim()) {
            this.editor.innerHTML = '<p>Start collaborating... 🚀</p>';
        }

        // Initialize last content
        this.lastContent = this.editor.innerHTML;
        
        console.log('📝 Editor manager initialized');
    }

    handleInput(event) {
        const content = this.editor.innerHTML;
        
        // Only emit if content actually changed
        if (content !== this.lastContent) {
            this.lastContent = content;
            this.updateStats();

            // Emit text change to server
            if (this.socket && this.socket.connected) {
                this.socket.emit('text-change', {
                    content: content,
                    documentId: this.documentId
                });
            }
        }
    }

    handleTypingStart() {
        if (!this.isTyping) {
            this.isTyping = true;
            if (this.socket && this.socket.connected) {
                this.socket.emit('user-typing', true);
            }
        }

        // Clear existing timeout
        clearTimeout(this.typingTimeout);
    }

    handleTypingEnd() {
        this.typingTimeout = setTimeout(() => {
            this.isTyping = false;
            if (this.socket && this.socket.connected) {
                this.socket.emit('user-typing', false);
            }
        }, 1000);
    }

    updateCursorPosition() {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const editorRect = this.editor.getBoundingClientRect();

        const cursorData = {
            x: rect.left - editorRect.left,
            y: rect.top - editorRect.top + this.editor.scrollTop,
            height: rect.height || 20
        };

        if (this.socket && this.socket.connected) {
            this.socket.emit('cursor-move', cursorData);
        }
    }

    updateStats() {
        const content = this.editor.textContent || '';
        const charCount = content.length;
        const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
        
        const charCountElement = document.getElementById('char-count');
        const wordCountElement = document.getElementById('word-count');
        
        if (charCountElement) {
            charCountElement.textContent = `${charCount} characters`;
        }
        if (wordCountElement) {
            wordCountElement.textContent = `${wordCount} words`;
        }
    }

    setContent(content) {
        if (content === this.lastContent) return;
        
        const currentPosition = this.saveSelection();
        this.editor.innerHTML = content;
        this.lastContent = content;
        this.restoreSelection(currentPosition);
        this.updateStats();
    }

    saveSelection() {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return null;
        
        const range = selection.getRangeAt(0);
        const preSelectionRange = range.cloneRange();
        preSelectionRange.selectNodeContents(this.editor);
        preSelectionRange.setEnd(range.startContainer, range.startOffset);
        const start = preSelectionRange.toString().length;
        
        return {
            start: start,
            end: start + range.toString().length,
            scrollTop: this.editor.scrollTop
        };
    }

    restoreSelection(savedSelection) {
        if (!savedSelection) return;
        
        const charIndex = 0;
        let range = document.createRange();
        range.setStart(this.editor, 0);
        range.collapse(true);
        
        const nodeStack = [this.editor];
        let node = null;
        let foundStart = false;
        let stop = false;
        let charCount = 0;
        
        while (!stop && (node = nodeStack.pop())) {
            if (node.nodeType === 3) {
                const nextCharCount = charCount + node.length;
                if (!foundStart && savedSelection.start >= charCount && savedSelection.start <= nextCharCount) {
                    range.setStart(node, savedSelection.start - charCount);
                    foundStart = true;
                }
                if (foundStart && savedSelection.end >= charCount && savedSelection.end <= nextCharCount) {
                    range.setEnd(node, savedSelection.end - charCount);
                    stop = true;
                }
                charCount = nextCharCount;
            } else {
                let i = node.childNodes.length;
                while (i--) {
                    nodeStack.push(node.childNodes[i]);
                }
            }
        }
        
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        this.editor.scrollTop = savedSelection.scrollTop;
    }

    focus() {
        this.editor.focus();
    }

    clear() {
        this.editor.innerHTML = '';
        this.lastContent = '';
        this.updateStats();
    }

    getContent() {
        return this.editor.innerHTML;
    }

    // Method to handle formatted content (for future rich text features)
    insertText(text, format = {}) {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        range.deleteContents();
        
        const textNode = document.createTextNode(text);
        range.insertNode(textNode);
        
        // Move cursor after inserted text
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);
        
        // Trigger input event
        this.editor.dispatchEvent(new Event('input', { bubbles: true }));
    }
}