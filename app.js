 import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
        import { 
            getAuth, 
            createUserWithEmailAndPassword, 
            signInWithEmailAndPassword, 
            onAuthStateChanged, 
            signOut,
            updateProfile
        } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
        import { 
            getFirestore, 
            collection, 
            addDoc, 
            onSnapshot, 
            query, 
            orderBy, 
            serverTimestamp,
            doc,
            setDoc,
            updateDoc,
            getDoc
        } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

        const firebaseConfig = {
            apiKey: "AIzaSyB8zBPJkyeKfmdFaW9PJzqkoyZsBYO9kzo",
            authDomain: "sm-music-ca8a9.firebaseapp.com",
            projectId: "sm-music-ca8a9",
            storageBucket: "sm-music-ca8a9.firebasestorage.app",
            messagingSenderId: "273821857220",
            appId: "1:273821857220:web:aa039e6d70149b15df2091",
            measurementId: "G-EZBJ9T6CMB"
        };

        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);

        let currentUser = null;
        let isTyping = false;
        let typingTimeout = null;

        // Auth UI handling
        const authForm = document.getElementById('authForm');
        const authToggle = document.getElementById('authToggle');
        const authTitle = document.getElementById('authTitle');
        const displayNameInput = document.getElementById('displayName');
        let isLoginMode = true;

        authToggle.addEventListener('click', () => {
            isLoginMode = !isLoginMode;
            authTitle.textContent = isLoginMode ? 'Login to Chat' : 'Sign Up for Chat';
            displayNameInput.style.display = isLoginMode ? 'none' : 'block';
            authToggle.textContent = isLoginMode ? 
                "Don't have an account? Sign up" : 
                "Already have an account? Login";
        });

        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const displayName = document.getElementById('displayName').value;
            const authError = document.getElementById('authError');

            try {
                if (isLoginMode) {
                    await signInWithEmailAndPassword(auth, email, password);
                } else {
                    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                    await updateProfile(userCredential.user, {
                        displayName: displayName
                    });
                    await setDoc(doc(db, "users", userCredential.user.uid), {
                        email: email,
                        displayName: displayName,
                        lastSeen: serverTimestamp(),
                        status: 'online'
                    });
                }
                authError.textContent = '';
            } catch (error) {
                authError.textContent = error.message;
            }
        });

        // User presence system
        async function updateUserPresence(userId, status) {
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, {
                status: status,
                lastSeen: serverTimestamp()
            });
        }

        // Message handling
        function createMessageElement(message, isOwnMessage) {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${isOwnMessage ? 'sent' : 'received'}`;
            
            const content = document.createElement('div');
            content.className = 'message-content';
            
            const text = document.createElement('div');
            text.textContent = message.text;
            
            const meta = document.createElement('div');
            meta.className = 'message-meta';
            meta.textContent = message.userEmail;
            
            const status = document.createElement('div');
            status.className = 'message-status';
            status.innerHTML = `
                <i class="fas ${message.status === 'sent' ? 'fa-check' : 'fa-check-double'}"></i>
                ${new Date(message.timestamp?.toDate()).toLocaleTimeString()}
            `;
            
            content.appendChild(text);
            content.appendChild(meta);
            content.appendChild(status);
            messageDiv.appendChild(content);
            
            return messageDiv;
        }

        window.sendMessage = async () => {
            const input = document.getElementById('messageInput');
            const message = input.value.trim();
            
            if (message && currentUser) {
                try {
                    const messageRef = await addDoc(collection(db, "messages"), {
                        text: message,
                        userId: currentUser.uid,
                        userEmail: currentUser.email,
                        displayName: currentUser.displayName,
                        timestamp: serverTimestamp(),
                        status: 'sent'
                    });
                    
                    input.value = '';
                    updateTypingStatus(false);
                    
                    // Update message status to 'delivered' after sending
                    setTimeout(async () => {
                        await updateDoc(messageRef, {
                            status: 'delivered'
                        });
                    }, 1000);
                } catch (error) {
                    console.error("Error sending message:", error);
                }
            }
        };

        // Typing indicator
        function updateTypingStatus(isTyping) {
            if (currentUser) {
                const typingRef = doc(db, "typing", currentUser.uid);
                setDoc(typingRef, {
                    userId: currentUser.uid,
                    displayName: currentUser.displayName,
                    isTyping: isTyping,
                    timestamp: serverTimestamp()
                });
            }
        }

        document.getElementById('messageInput').addEventListener('input', (e) => {
            if (!isTyping) {
                isTyping = true;
                updateTypingStatus(true);
            }
            
            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => {
                isTyping = false;
                updateTypingStatus(false);
            }, 2000);
        });

        // Auth state observer and message listener
        onAuthStateChanged(auth, async (user) => {
            currentUser = user;
            document.getElementById('auth').style.display = user ? 'none' : 'block';
            document.getElementById('chat').style.display = user ? 'flex' : 'none';
            
            if (user) {
                document.getElementById('userEmail').textContent = user.email;
                await updateUserPresence(user.uid, 'online');

                // Message listener
                const q = query(collection(db, "messages"), orderBy("timestamp"));
                onSnapshot(q, (snapshot) => {
                    const messages = document.getElementById('messages');
                    messages.innerHTML = '';
                    
                    snapshot.forEach((doc) => {
                        const data = doc.data();
                        const isOwnMessage = data.userId === user.uid;
                        const messageElement = createMessageElement(data, isOwnMessage);
                        messages.appendChild(messageElement);
                    });
                    
                    messages.scrollTop = messages.scrollHeight;
                });

                // Typing indicator listener
                onSnapshot(collection(db, "typing"), (snapshot) => {
                    const typingUsers = [];
                    snapshot.forEach((doc) => {
                        const data = doc.data();
                        if (data.isTyping && data.userId !== user.uid) {
                            typingUsers.push(data.displayName);
                        }
                    });

                    const typingIndicator = document.getElementById('typingIndicator');
                    if (typingUsers.length > 0) {
                        typingIndicator.textContent = `${typingUsers.join(', ')} ${typingUsers.length === 1 ? 'is' : 'are'} typing...`;
                        typingIndicator.style.display = 'block';
                    } else {
                        typingIndicator.style.display = 'none';
                    }
                });

                // User presence listener
                onSnapshot(collection(db, "users"), (snapshot) => {
                    const userList = document.getElementById('userList');
                    userList.innerHTML = '';
                    
                    snapshot.forEach((doc) => {
                        const userData = doc.data();
                        if (doc.id !== user.uid) {
                            const userElement = document.createElement('div');
                            userElement.className = 'user-item';
                            userElement.innerHTML = `
                                <div class="user-avatar">${userData.displayName?.[0] || userData.email[0]}</div>
                                <div class="user-info">
                                    <div>${userData.displayName || userData.email}</div>
                                    <small>${userData.status === 'online' ? 'Online' : 'Offline'}</small>
                                </div>
                                <div class="user-status ${userData.status}"></div>
                            `;
                            userList.appendChild(userElement);
                        }
                    });
                });
            }
        });

        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            if (currentUser) {
                updateUserPresence(currentUser.uid, 'offline');
            }
        });

        window.logout = async () => {
            if (currentUser) {
                await updateUserPresence(currentUser.uid, 'offline');
                await signOut(auth);
            }
        };

        // Handle Enter key in message input
        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                window.sendMessage();
            }
        });
  
