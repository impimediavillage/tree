declare module 'firebase-admin' {
  import { Timestamp as FirestoreTimestamp, FieldValue as FirestoreFieldValue } from 'firebase/firestore';
  
  namespace admin {
    const apps: any[];
    function initializeApp(config?: any): any;
    
    namespace firestore {
      class Timestamp {
        static now(): Timestamp;
        static fromDate(date: Date): Timestamp;
        toDate(): Date;
      }
      
      class FieldValue {
        static serverTimestamp(): FieldValue;
        static delete(): FieldValue;
        static increment(n: number): FieldValue;
        static arrayUnion(...elements: any[]): FieldValue;
        static arrayRemove(...elements: any[]): FieldValue;
      }
    }
    
    namespace auth {
      interface UserRecord {
        uid: string;
        email?: string;
        displayName?: string;
        photoURL?: string;
        phoneNumber?: string;
        disabled: boolean;
        metadata: {
          creationTime?: string;
          lastSignInTime?: string;
        };
        customClaims?: { [key: string]: any };
      }
      
      function getAuth(): {
        getUser(uid: string): Promise<UserRecord>;
        getUserByEmail(email: string): Promise<UserRecord>;
        createUser(properties: any): Promise<UserRecord>;
        updateUser(uid: string, properties: any): Promise<UserRecord>;
        deleteUser(uid: string): Promise<void>;
        setCustomUserClaims(uid: string, claims: any): Promise<void>;
      };
    }
    
    namespace storage {
      function bucket(name?: string): any;
    }
    
    function firestore(): any;
    function auth(): any;
    function storage(): any;
  }
  
  export = admin;
}
