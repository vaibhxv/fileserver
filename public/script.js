const baseUrl = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register');
    const loginForm = document.getElementById('login');
    const uploadForm = document.getElementById('upload-form');
    const fileList = document.getElementById('file-list');
    const filesUl = document.getElementById('files');
    const uploadSection = document.getElementById('upload-section');
    const openUploadFormButton = document.getElementById('open-upload-form');
    const logoutButton = document.getElementById('logout-button');
    const registerMessage = document.getElementById('register-message');
    const loginMessage = document.getElementById('login-message');
    const uploadMessage = document.getElementById('upload-message');
    const showLogin = document.getElementById('show-login');
    const showRegister = document.getElementById('show-register');
    const registerFormContainer = document.getElementById('register-form');
    const loginFormContainer = document.getElementById('login-form');
    const filePreviewModal = document.getElementById('file-preview-modal');
    const filePreview = document.getElementById('file-preview');
    const closeModal = document.getElementById('close-modal');

    // Show only login form initially
    registerFormContainer.style.display = 'none';
    loginFormContainer.style.display = 'block';
    uploadSection.style.display = 'none';
    fileList.style.display = 'none';

    // Toggle between login and register forms
    showLogin.addEventListener('click', () => {
        registerFormContainer.style.display = 'none';
        loginFormContainer.style.display = 'block';
    });

    showRegister.addEventListener('click', () => {
        loginFormContainer.style.display = 'none';
        registerFormContainer.style.display = 'block';
    });

    // Register user
    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const username = document.getElementById('register-username').value;
        const password = document.getElementById('register-password').value;

        try {
            const response = await fetch(`${baseUrl}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const result = await response.json();
            registerMessage.textContent = result.message || result.error;
        } catch (error) {
            registerMessage.textContent = 'Error registering user.';
        }
    });

    // Login user
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        try {
            const response = await fetch(`${baseUrl}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const result = await response.json();
            if (response.ok) {
                localStorage.setItem('token', result.token);
                loginMessage.textContent = 'Login successful!';
                registerFormContainer.style.display = 'none';
                loginFormContainer.style.display = 'none';
                uploadSection.style.display = 'block';
                fileList.style.display = 'block';
                await loadFiles();
            } else {
                loginMessage.textContent = result.error;
            }
        } catch (error) {
            loginMessage.textContent = 'Error logging in.';
        }
    });

    // Logout user
    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('token');
        loginFormContainer.style.display = 'block';
        uploadSection.style.display = 'none';
        fileList.style.display = 'none';
        loginMessage.textContent = 'You have been logged out.';
    });

    // Open/close upload form
    openUploadFormButton.addEventListener('click', () => {
        uploadForm.style.display = uploadForm.style.display === 'none' ? 'block' : 'none';
    });

   // Upload file with progress bar
uploadForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const fileInput = document.getElementById('file');
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    const progressBar = document.getElementById('progress-bar');
    const progressContainer = document.getElementById('progress-container');

    progressContainer.style.display = 'block';

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${baseUrl}/upload`, true);
    xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('token')}`);

    xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
            const percent = Math.min(100, (event.loaded / event.total) * 100);
            progressBar.style.width = `${percent}%`;
        }
    });

    xhr.addEventListener('load', async () => {
        progressContainer.style.display = 'none';
        if (xhr.status >= 200 && xhr.status < 300) {
            const result = JSON.parse(xhr.responseText);
            uploadMessage.textContent = result.message || result.error;
            await loadFiles();
        } else {
            uploadMessage.textContent = 'Error uploading file.';
        }
    });

    xhr.addEventListener('error', () => {
        progressContainer.style.display = 'none';
        uploadMessage.textContent = 'Error uploading file.';
    });

    xhr.send(formData);
});


    // Load files
    async function loadFiles() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${baseUrl}/files`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            if (response.ok) {
                filesUl.innerHTML = '';
                result.files.forEach(file => {
                    const li = document.createElement('li');
                    const fileLink = document.createElement('a');
                    fileLink.href = '#';
                    fileLink.textContent = file;
                    fileLink.dataset.file = file;
                    li.appendChild(fileLink);
                    filesUl.appendChild(li);
                });
            }
        } catch (error) {
            filesUl.innerHTML = 'Error loading files.';
        }
    }

   // File preview and spinner
   filesUl.addEventListener('click', async (event) => {
    if (event.target.tagName === 'A') {
        event.preventDefault();
        const fileName = event.target.dataset.file;

        // Show spinner
        document.getElementById('file-spinner-container').style.display = 'block';
        filePreview.innerHTML = '';

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${baseUrl}/view-video?file=${encodeURIComponent(fileName)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const contentType = response.headers.get('Content-Type');

            if (response.ok) {
                let fileContent;
                if (contentType.startsWith('video/')) {
                    fileContent = `<video controls src="${URL.createObjectURL(await response.blob())}" style="width: 100%; height: auto;"></video>`;
                } else {
                    fileContent = 'File type not supported for preview.';
                }
                filePreview.innerHTML = fileContent;
            } else {
                filePreview.innerHTML = 'Error loading file.';
            }
        } catch (error) {
            filePreview.innerHTML = 'Error loading file.';
        } finally {
            // Hide spinner
            document.getElementById('file-spinner-container').style.display = 'none';
            filePreviewModal.style.display = 'block';
        }
    }
});

    // Close modal
    closeModal.addEventListener('click', () => {
        filePreviewModal.style.display = 'none';
    });

    // Show/hide forms based on login state
    function checkLoginState() {
        if (localStorage.getItem('token')) {
            registerFormContainer.style.display = 'none';
            loginFormContainer.style.display = 'none';
            uploadSection.style.display = 'block';
            fileList.style.display = 'block';
            loadFiles();
        } else {
            registerFormContainer.style.display = 'block';
            loginFormContainer.style.display = 'block';
            uploadSection.style.display = 'none';
            fileList.style.display = 'none';
        }
    }

    checkLoginState();
});
