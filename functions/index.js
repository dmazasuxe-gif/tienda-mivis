/**
 * Firebase Cloud Functions 
 * MIVIS STUDIO GLAM - Automatic Backup System v1.0
 */

const { onDocumentCreated, onDocumentWritten } = require('firebase-functions/v2/firestore');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();
const storage = admin.storage();

// Configure global options: memory and region (optional)
setGlobalOptions({ region: 'us-central1' });

/**
 * 1. Automatic Backup Function
 * Generates a full JSON backup on Cloud Storage when a change occurs.
 */
async function performBackup() {
    try {
        console.log('--- Comprobando necesidad de Backup ---');

        // --- COOLDOWN LOGIC: Solo 1 backup cada 24 horas ---
        const statusRef = db.collection('settings').doc('backup_status');
        const statusDoc = await statusRef.get(); // 1 read
        const now = Date.now();
        const COOLDOWN_TIME = 24 * 60 * 60 * 1000; // 24 Horas

        if (statusDoc.exists) {
            const lastBackup = statusDoc.data().lastAutoBackup || 0;
            if (now - lastBackup < COOLDOWN_TIME) {
                console.log('Backup omitido: Cooldown activo (Ya se hizo uno hace menos de 24h)');
                return false;
            }
        }

        console.log('--- Iniciando Backup Automático (Lectura completa) ---');

        // Use standard collection names matching the app logic
        const collections = ['products', 'customers', 'sales', 'settings'];
        const backupData = {
            products: [],
            customers: [],
            sales: [],
            settings: {},
            createdAt: new Date().toISOString()
        };

        // Fetch data from all collections
        for (const colName of collections) {
            const snapshot = await db.collection(colName).get();
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (colName === 'settings') {
                const configDoc = data.find(d => d.id === 'config');
                backupData.settings = configDoc || {};
            } else {
                backupData[colName] = data;
            }
        }

        // Generate Filename: backup-YYYY-MM-DD-HH-MM.json
        const dateObj = new Date();
        const dateStr = dateObj.toISOString().split('T')[0];
        const timeStr = dateObj.getHours().toString().padStart(2, '0') + '-' +
            dateObj.getMinutes().toString().padStart(2, '0');
        const fileName = `backups/backup-${dateStr}-${timeStr}.json`;

        // Save to Firebase Storage
        const bucket = storage.bucket();
        const file = bucket.file(fileName);

        await file.save(JSON.stringify(backupData, null, 2), {
            contentType: 'application/json',
            metadata: {
                metadata: {
                    type: 'auto-backup',
                    timestamp: backupData.createdAt
                }
            }
        });

        // Update status for cooldown
        await statusRef.set({ lastAutoBackup: now }, { merge: true });

        console.log(`Backup creado con éxito: ${fileName}`);

        // --- Retention Policy: Max 20 backups ---
        const [files] = await bucket.getFiles({ prefix: 'backups/' });

        // Sort by creation time (older first)
        const sortedFiles = files
            .filter(f => f.name.endsWith('.json'))
            .sort((a, b) => new Date(a.metadata.timeCreated) - new Date(b.metadata.timeCreated));

        if (sortedFiles.length > 20) {
            const filesToDelete = sortedFiles.slice(0, sortedFiles.length - 20);
            console.log(`Eliminando ${filesToDelete.length} backups antiguos...`);
            for (const f of filesToDelete) {
                await f.delete();
                console.log(`Eliminado: ${f.name}`);
            }
        }

        return true;
    } catch (error) {
        console.error('Error en el proceso de backup:', error);
        return false;
    }
}

// ──────────────────────────────────────────────
// Firestore Triggers
// ──────────────────────────────────────────────

// Trigger for Products
exports.backupOnProductCreate = onDocumentCreated('products/{productId}', async (event) => {
    return await performBackup();
});

// Trigger for Customers
exports.backupOnCustomerCreate = onDocumentCreated('customers/{customerId}', async (event) => {
    return await performBackup();
});

// Trigger for Sales
exports.backupOnSaleCreate = onDocumentCreated('sales/{saleId}', async (event) => {
    return await performBackup();
});

// Trigger for Settings (on document write since it's only one)
exports.backupOnSettingsChange = onDocumentWritten('settings/config', async (event) => {
    return await performBackup();
});
