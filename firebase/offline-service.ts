import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy,
  setDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from './config';
import { MOCK_USERS, MOCK_PROJECT_DATA, TRANSLATIONS } from '../constants';
import type { User, Vehicle, Driver, Incident, Transfer, ProjectData, Supervisor, ProjectMetadata, AdminNotification, ProjectOfficer, Foreman } from '../types';

// Simple offline login function
export const loginUserOffline = async (email: string, password: string): Promise<User | null> => {
    try {
        console.log('🔑 Offline login attempt for:', email);
        
        // Admin hardcoded login
        if (email === 'zahran@projects.reports' && password === 'zahran111') {
            console.log('✅ Admin login successful');
            return {
                uid: 'admin-offline',
                email: 'zahran@projects.reports',
                password: 'zahran111',
                isAdmin: true,
                projectName: 'Zahran Admin',
                projectManagerName: 'Admin',
                projectId: 'ADM-001',
                operatorName: 'Admin'
            };
        }
        
        // Check Firestore for user
        const usersQuery = query(collection(db, 'users'), where('email', '==', email));
        const snapshot = await getDocs(usersQuery);
        
        if (!snapshot.empty) {
            const userData = snapshot.docs[0].data() as User;
            console.log('👤 Found user in Firestore');
            
            if (userData.password === password) {
                console.log('✅ Password matches - login successful');
                return userData;
            } else {
                console.log('❌ Invalid password');
                return null;
            }
        } else {
            console.log('❌ User not found');
            return null;
        }
    } catch (error) {
        console.error('❌ Offline login error:', error);
        return null;
    }
};

// Simple password reset
export const resetPasswordOffline = async (email: string, newPassword: string): Promise<boolean> => {
    try {
        console.log('🔄 Resetting password for:', email);
        
        const usersQuery = query(collection(db, 'users'), where('email', '==', email));
        const snapshot = await getDocs(usersQuery);
        
        if (!snapshot.empty) {
            const userDoc = snapshot.docs[0];
            await updateDoc(userDoc.ref, {
                password: newPassword,
                updatedAt: new Date().toISOString(),
                lastPasswordReset: new Date().toISOString()
            });
            console.log('✅ Password updated successfully');
            return true;
        } else {
            console.log('❌ User not found');
            return false;
        }
    } catch (error) {
        console.error('❌ Password reset error:', error);
        return false;
    }
};

// Check if user exists
export const checkUserExistsOffline = async (email: string): Promise<boolean> => {
    try {
        const usersQuery = query(collection(db, 'users'), where('email', '==', email));
        const snapshot = await getDocs(usersQuery);
        return !snapshot.empty;
    } catch (error) {
        console.error('Error checking user existence:', error);
        return false;
    }
};

// Update single user password (Admin function)
export const updateUserPasswordOffline = async (userEmail: string, newPassword: string): Promise<boolean> => {
    try {
        console.log('🔐 Admin updating password for:', userEmail);
        
        const usersQuery = query(collection(db, 'users'), where('email', '==', userEmail));
        const snapshot = await getDocs(usersQuery);
        
        if (!snapshot.empty) {
            const userDoc = snapshot.docs[0];
            await updateDoc(userDoc.ref, {
                password: newPassword,
                updatedAt: new Date().toISOString(),
                lastPasswordReset: new Date().toISOString(),
                passwordUpdatedBy: 'admin'
            });
            console.log('✅ User password updated successfully by admin');
            return true;
        } else {
            console.log('❌ User not found');
            return false;
        }
    } catch (error) {
        console.error('❌ Admin password update error:', error);
        return false;
    }
};

// Update all users passwords (Admin function)
export const updateAllUsersPasswordsOffline = async (newPassword: string, excludeAdmin: boolean = true): Promise<boolean> => {
    try {
        console.log('🔐 Admin updating all user passwords');
        
        const usersQuery = excludeAdmin 
            ? query(collection(db, 'users'), where('isAdmin', '!=', true))
            : collection(db, 'users');
        
        const snapshot = await getDocs(usersQuery);
        
        if (snapshot.empty) {
            console.log('❌ No users found to update');
            return false;
        }

        const batch = writeBatch(db);
        const updateData = {
            password: newPassword,
            updatedAt: new Date().toISOString(),
            lastPasswordReset: new Date().toISOString(),
            passwordUpdatedBy: 'admin-bulk'
        };

        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, updateData);
        });

        await batch.commit();
        console.log(`✅ Successfully updated passwords for ${snapshot.docs.length} users`);
        return true;
    } catch (error) {
        console.error('❌ Bulk password update error:', error);
        return false;
    }
};

// Verify security answer
export const verifySecurityAnswerOffline = async (email: string, answer: string): Promise<boolean> => {
    try {
        const usersQuery = query(collection(db, 'users'), where('email', '==', email));
        const snapshot = await getDocs(usersQuery);
        
        if (!snapshot.empty) {
            const userData = snapshot.docs[0].data();
            const correctAnswer = (userData.securityAnswer || 'zahran').toLowerCase().trim();
            return correctAnswer === answer.toLowerCase().trim();
        }
        return false;
    } catch (error) {
        console.error('Error verifying security answer:', error);
        return false;
    }
};