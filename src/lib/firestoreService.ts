import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { DSRRecord, BrandMetric } from '../types';
import { parseSingleMessage } from '../utils/dsrParser';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {},
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const COLLECTION_NAME = 'dsrRecords';

/**
 * Subscribe to DSR Records in Firestore with real-time updates
 */
export function subscribeDSRRecords(
  onData: (records: DSRRecord[]) => void,
  onError?: (err: any) => void
) {
  // Query entire collection directly so missing fields or index issues never drop documents
  const colRef = collection(db, COLLECTION_NAME);

  return onSnapshot(
    colRef,
    (snapshot) => {
      const records: DSRRecord[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        const rawBrands = data.brands || {};
        let brandsMap: Record<string, BrandMetric> = {};

        if (typeof rawBrands === 'object' && rawBrands !== null) {
          Object.entries(rawBrands).forEach(([bName, val]: [string, any]) => {
            if (bName && bName.trim()) {
              const key = bName.trim();
              if (typeof val === 'object' && val !== null) {
                brandsMap[key] = {
                  productiveCall: Number(val.productiveCall) || 0,
                  salesValue: Number(val.salesValue) || 0,
                };
              } else {
                brandsMap[key] = {
                  productiveCall: 0,
                  salesValue: Number(val) || 0,
                };
              }
            }
          });
        }

        const isEdited = Boolean(data.isEdited);
        const rawText = data.rawText || '';

        // Only auto-reparse rawText if the record was NOT manually edited AND brands is completely empty
        if (!isEdited && Object.keys(brandsMap).length === 0 && rawText && rawText.length > 10) {
          try {
            const reParsed = parseSingleMessage(rawText, 0);
            if (Object.keys(reParsed.brands).length > 0) {
              brandsMap = reParsed.brands;
            }
          } catch (e) {
            // fallback gracefully
          }
        }

        return {
          id: docSnap.id,
          date: data.date || '',
          day: data.day || '',
          dsrName: data.dsrName || '',
          distributorName: data.distributorName || '',
          beat: data.beat || '',
          totalOutlet: Number(data.totalOutlet) || 0,
          totalCall: Number(data.totalCall) || 0,
          totalProductiveCall: Number(data.totalProductiveCall) || 0,
          totalSalesValue: Number(data.totalSalesValue) || 0,
          brands: brandsMap,
          rawText,
          parseWarnings: data.parseWarnings || [],
          createdAt: typeof data.createdAt === 'number' && !isNaN(data.createdAt) ? data.createdAt : Date.now(),
          isEdited,
        } as DSRRecord;
      });

      // Sort in memory by createdAt descending
      records.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));

      onData(records);
    },
    (error) => {
      console.error('Firestore subscription error:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
    }
  );
}

/**
 * Clean and sanitize a DSRRecord object to guarantee no undefined or NaN values reach Firestore
 */
export function sanitizeRecordForFirestore(record: DSRRecord): Record<string, any> {
  const cleanBrands: Record<string, { productiveCall: number; salesValue: number }> = {};
  if (record.brands && typeof record.brands === 'object') {
    Object.entries(record.brands).forEach(([bName, val]) => {
      if (bName && bName.trim()) {
        const key = bName.trim();
        if (typeof val === 'object' && val !== null) {
          const pc = Number((val as any).productiveCall);
          const sv = Number((val as any).salesValue);
          cleanBrands[key] = {
            productiveCall: isNaN(pc) ? 0 : pc,
            salesValue: isNaN(sv) ? 0 : sv,
          };
        } else if (typeof val === 'number') {
          cleanBrands[key] = {
            productiveCall: 0,
            salesValue: isNaN(val) ? 0 : val,
          };
        } else {
          cleanBrands[key] = { productiveCall: 0, salesValue: 0 };
        }
      }
    });
  }

  const recordId = String(record.id || `dsr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);

  return {
    id: recordId,
    date: String(record.date || ''),
    day: String(record.day || ''),
    dsrName: String(record.dsrName || ''),
    distributorName: String(record.distributorName || ''),
    beat: String(record.beat || ''),
    totalOutlet: isNaN(Number(record.totalOutlet)) ? 0 : Number(record.totalOutlet),
    totalCall: isNaN(Number(record.totalCall)) ? 0 : Number(record.totalCall),
    totalProductiveCall: isNaN(Number(record.totalProductiveCall)) ? 0 : Number(record.totalProductiveCall),
    totalSalesValue: isNaN(Number(record.totalSalesValue)) ? 0 : Number(record.totalSalesValue),
    brands: cleanBrands,
    rawText: String(record.rawText || ''),
    parseWarnings: Array.isArray(record.parseWarnings) ? record.parseWarnings.map(String) : [],
    createdAt: typeof record.createdAt === 'number' && !isNaN(record.createdAt) ? record.createdAt : Date.now(),
    isEdited: Boolean(record.isEdited),
  };
}

/**
 * Save or update a single DSR Record
 */
export async function saveDSRRecordToDB(record: DSRRecord): Promise<void> {
  const sanitized = sanitizeRecordForFirestore(record);
  const docRef = doc(db, COLLECTION_NAME, sanitized.id);
  try {
    await setDoc(docRef, sanitized, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${COLLECTION_NAME}/${sanitized.id}`);
  }
}

/**
 * Batch save multiple DSR Records in chunks of max 400 operations to satisfy Firestore batch limits
 */
export async function batchSaveDSRRecordsToDB(records: DSRRecord[]): Promise<void> {
  if (records.length === 0) return;
  const CHUNK_SIZE = 400;
  try {
    for (let i = 0; i < records.length; i += CHUNK_SIZE) {
      const chunk = records.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach((record) => {
        const sanitized = sanitizeRecordForFirestore(record);
        const docRef = doc(db, COLLECTION_NAME, sanitized.id);
        batch.set(docRef, sanitized, { merge: true });
      });
      await batch.commit();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, COLLECTION_NAME);
  }
}

/**
 * Delete a single DSR Record
 */
export async function deleteDSRRecordFromDB(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
  }
}

/**
 * Bulk delete DSR Records in chunks
 */
export async function bulkDeleteDSRRecordsFromDB(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const CHUNK_SIZE = 400;
  try {
    for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
      const chunk = ids.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach((id) => {
        const docRef = doc(db, COLLECTION_NAME, id);
        batch.delete(docRef);
      });
      await batch.commit();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, COLLECTION_NAME);
  }
}

/**
 * Clear all DSR Records in database in chunks
 */
export async function clearAllDSRRecordsInDB(): Promise<void> {
  try {
    const snapshot = await getDocs(collection(db, COLLECTION_NAME));
    if (snapshot.docs.length === 0) return;
    const CHUNK_SIZE = 400;
    for (let i = 0; i < snapshot.docs.length; i += CHUNK_SIZE) {
      const chunk = snapshot.docs.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, COLLECTION_NAME);
  }
}
