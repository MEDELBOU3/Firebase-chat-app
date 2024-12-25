
        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
        import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
        import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

        window.signup = async () => {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            try {
                await createUserWithEmailAndPassword(auth, email, password);
            } catch (error) {
                alert(error.message);
            }
        };

        window.login = async () => {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            try {
                await signInWithEmailAndPassword(auth, email, password);
            } catch (error) {
                alert(error.message);
            }
        };

        window.logout = () => signOut(auth);

        window.sendMessage = async () => {
            const input = document.getElementById('message-input');
            const message = input.value.trim();
            
            if (message && currentUser) {
                try {
                    await addDoc(collection(db, "messages"), {
                        text: message,
                        userId: currentUser.uid,
                        userEmail: currentUser.email,
                        timestamp: serverTimestamp()
                    });
                    input.value = '';
                } catch (error) {
                    console.error("Error sending message:", error);
                }
            }
        };

        document.getElementById('message-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                window.sendMessage();
            }
        });

        onAuthStateChanged(auth, (user) => {
            currentUser = user;
            document.getElementById('auth').style.display = user ? 'none' : 'flex';
            document.getElementById('chat').style.display = user ? 'flex' : 'none';
            
            if (user) {
                document.getElementById('user-email').textContent = user.email;
                
                const q = query(collection(db, "messages"), orderBy("timestamp"));
                onSnapshot(q, (snapshot) => {
                    const messages = document.getElementById('messages');
                    messages.innerHTML = '';
                    
                    snapshot.forEach((doc) => {
                        const data = doc.data();
                        const messageDiv = document.createElement('div');
                        messageDiv.className = `message ${data.userId === user.uid ? 'sent' : 'received'}`;
                        messageDiv.textContent = data.text;
                        messages.appendChild(messageDiv);
                    });
                    
                    messages.scrollTop = messages.scrollHeight;
                });
            }
        });
