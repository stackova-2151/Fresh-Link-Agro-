'use client';

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';

export default function TestFirestorePage() {
  const [log, setLog] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addLog = (msg: string) => {
    console.log(msg);
    setLog((prev) => [...prev, msg]);
  };

  const testFirestore = async () => {
    setLog([]);
    setLoading(true);
    
    try {
      addLog('🔍 Testing Firestore connection...');
      
      // Test 1: Check if db is initialized
      if (!db) {
        addLog('❌ Firestore db is not initialized');
        setLoading(false);
        return;
      }
      addLog('✅ Firestore db initialized');

      // Test 2: Try to write a test document
      addLog('📝 Attempting to write test document...');
      const testRef = await addDoc(collection(db, 'test'), {
        message: 'Hello Firestore',
        timestamp: new Date().toISOString(),
      });
      addLog(`✅ Test document written with ID: ${testRef.id}`);

      // Test 3: Try to read back
      addLog('📖 Attempting to read test collection...');
      const snap = await getDocs(collection(db, 'test'));
      addLog(`✅ Read ${snap.docs.length} documents from test collection`);

      // Test 4: Try inwardVouchers collection
      addLog('📖 Checking inwardVouchers collection...');
      const vouchersSnap = await getDocs(collection(db, 'inwardVouchers'));
      addLog(`✅ Found ${vouchersSnap.docs.length} documents in inwardVouchers`);

      addLog('🎉 All tests passed! Firestore is working.');
    } catch (err: any) {
      addLog(`❌ Error: ${err.message}`);
      addLog(`Full error: ${JSON.stringify(err, null, 2)}`);
    }
    
    setLoading(false);
  };

  return (
    <div style={{ padding: 32, fontFamily: 'monospace' }}>
      <h1>Firestore Connection Test</h1>
      <button
        onClick={testFirestore}
        disabled={loading}
        style={{
          padding: '8px 16px',
          marginBottom: 16,
          cursor: loading ? 'not-allowed' : 'pointer',
          background: '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: 4,
        }}
      >
        {loading ? 'Testing...' : 'Run Test'}
      </button>
      <pre style={{ background: '#111', color: '#0f0', padding: 16, borderRadius: 8, whiteSpace: 'pre-wrap' }}>
        {log.join('\n') || 'Click "Run Test" to check Firestore connection...'}
      </pre>
      <div style={{ marginTop: 16, padding: 16, background: '#fff3cd', borderRadius: 8 }}>
        <strong>Expected results:</strong>
        <ul>
          <li>✅ Firestore db initialized</li>
          <li>✅ Test document written</li>
          <li>✅ Read documents from test collection</li>
          <li>✅ Check inwardVouchers collection</li>
        </ul>
        <p style={{ marginTop: 8 }}>
          <strong>If you see errors:</strong>
        </p>
        <ol>
          <li>Check Firebase Console → Firestore Database is enabled</li>
          <li>Check .env.local has correct Firebase config</li>
          <li>Check browser console for detailed errors</li>
          <li>Verify Firestore rules allow read/write in test mode</li>
        </ol>
      </div>
    </div>
  );
}
