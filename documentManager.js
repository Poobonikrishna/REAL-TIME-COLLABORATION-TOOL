const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');

class DocumentManager {
  constructor() {
    this.documents = new Map();
    this.initializeDefaultDocument();
  }

  initializeDefaultDocument() {
    const defaultDoc = this.createDocument('Welcome Document', config.WELCOME_DOCUMENT_CONTENT);
    console.log('📄 Initialized default document:', defaultDoc.id);
  }

  createDocument(title, content = '') {
    const id = uuidv4();
    const document = {
      id,
      title: title || config.DEFAULT_DOCUMENT_TITLE,
      content: content || '',
      createdAt: new Date(),
      updatedAt: new Date(),
      users: new Set(),
      version: 1
    };
    
    this.documents.set(id, document);
    console.log(`📄 Created document: "${title}" (${id})`);
    return document;
  }

  getDocument(id) {
    return this.documents.get(id);
  }

  getAllDocuments() {
    return Array.from(this.documents.values()).map(doc => ({
      id: doc.id,
      title: doc.title,
      userCount: doc.users.size,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      version: doc.version
    })).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  hasDocument(id) {
    return this.documents.has(id);
  }

  updateDocument(id, updates) {
    const document = this.documents.get(id);
    if (document) {
      Object.assign(document, updates, { 
        updatedAt: new Date(),
        version: document.version + 1
      });
      return true;
    }
    return false;
  }

  deleteDocument(id) {
    const document = this.documents.get(id);
    if (document) {
      console.log(`🗑️  Deleted document: "${document.title}" (${id})`);
      return this.documents.delete(id);
    }
    return false;
  }

  getDocumentCount() {
    return this.documents.size;
  }

  searchDocuments(query) {
    const searchTerm = query.toLowerCase();
    return Array.from(this.documents.values())
      .filter(doc => 
        doc.title.toLowerCase().includes(searchTerm) ||
        doc.content.toLowerCase().includes(searchTerm)
      )
      .map(doc => ({
        id: doc.id,
        title: doc.title,
        userCount: doc.users.size,
        updatedAt: doc.updatedAt
      }));
  }

  // Clean up old documents (for future use)
  cleanupOldDocuments(maxAgeHours = 24) {
    const cutoffTime = new Date(Date.now() - (maxAgeHours * 60 * 60 * 1000));
    let cleanedCount = 0;

    for (const [id, document] of this.documents.entries()) {
      if (document.users.size === 0 && document.updatedAt < cutoffTime) {
        this.documents.delete(id);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} old documents`);
    }

    return cleanedCount;
  }

  // Export document data (for backup/export functionality)
  exportDocument(id) {
    const document = this.documents.get(id);
    if (!document) return null;

    return {
      ...document,
      users: Array.from(document.users),
      // Don't include the actual Set in the export
      _usersCount: document.users.size
    };
  }
}

module.exports = DocumentManager;