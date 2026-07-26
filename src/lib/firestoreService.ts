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
import { DSRRecord } from '../types';

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
  const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const records: DSRRecord[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          date: data.date || '',
          day: data.day || '',
          dsrName: data.dsrName,
          distributorName: data.distributorName || '',
          beat: data.beat || '',
          totalOutlet: data.totalOutlet ?? 0,
          totalCall: data.totalCall ?? 0,
          totalProductiveCall: data.totalProductiveCall ?? 0,
          totalSalesValue: data.totalSalesValue ?? 0,
          brands: data.brands || {},
          rawText: data.rawText || '',
          parseWarnings: data.parseWarnings || [],
          createdAt: data.createdAt || Date.now(),
        } as DSRRecord;
      });
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
 * Save or update a single DSR Record
 */
export async function saveDSRRecordToDB(record: DSRRecord): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, record.id);
  const cleanRecord = {
    id: record.id,
    date: record.date || '',
    day: record.day || '',
    dsrName: record.dsrName || '',
    distributorName: record.distributorName || '',
    beat: record.beat || '',
    totalOutlet: Number(record.totalOutlet) || 0,
    totalCall: Number(record.totalCall) || 0,
    totalProductiveCall: Number(record.totalProductiveCall) || 0,
    totalSalesValue: Number(record.totalSalesValue) || 0,
    brands: record.brands || {},
    rawText: record.rawText || '',
    parseWarnings: record.parseWarnings || [],
    createdAt: record.createdAt || Date.now(),
  };

  try {
    await setDoc(docRef, cleanRecord, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${COLLECTION_NAME}/${record.id}`);
  }
}

/**
 * Batch save multiple DSR Records (e.g. from WhatsApp text parse or Google Sheet import)
 */
export async function batchSaveDSRRecordsToDB(records: DSRRecord[]): Promise<void> {
  if (records.length === 0) return;
  try {
    const batch = writeBatch(db);
    records.forEach((record) => {
      const docRef = doc(db, COLLECTION_NAME, record.id);
      batch.set(
        docRef,
        {
          id: record.id,
          date: record.date || '',
          day: record.day || '',
          dsrName: record.dsrName || '',
          distributorName: record.distributorName || '',
          beat: record.beat || '',
          totalOutlet: Number(record.totalOutlet) || 0,
          totalCall: Number(record.totalCall) || 0,
          totalProductiveCall: Number(record.totalProductiveCall) || 0,
          totalSalesValue: Number(record.totalSalesValue) || 0,
          brands: record.brands || {},
          rawText: record.rawText || '',
          parseWarnings: record.parseWarnings || [],
          createdAt: record.createdAt || Date.now(),
        },
        { merge: true }
      );
    });
    await batch.commit();
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
 * Bulk delete DSR Records
 */
export async function bulkDeleteDSRRecordsFromDB(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  try {
    const batch = writeBatch(db);
    ids.forEach((id) => {
      const docRef = doc(db, COLLECTION_NAME, id);
      batch.delete(docRef);
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, COLLECTION_NAME);
  }
}

/**
 * Clear all DSR Records in database
 */
export async function clearAllDSRRecordsInDB(): Promise<void> {
  try {
    const snapshot = await getDocs(collection(db, COLLECTION_NAME));
    const batch = writeBatch(db);
    snapshot.docs.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, COLLECTION_NAME);
  }
}
