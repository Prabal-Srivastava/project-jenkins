pipeline {
    agent any

    environment {
        DOCKERHUB_CREDENTIALS = credentials('docker-hub-repo')
        // Using a variable for the deploy path to keep things clean
        DEPLOY_PATH = '/opt/book-saas'
    }

    stages {
        stage('Checkout') {
            steps {
                git branch: 'main', url: 'https://github.com/your-repo/book-saas.git'
            }
        }

        stage('Build and Push Images') {
            steps {
                script {
                    // Login to Docker Hub
                    sh "echo ${DOCKERHUB_CREDENTIALS_PSW} | docker login -u ${DOCKERHUB_CREDENTIALS_USR} --password-stdin"
                    
                    // Build & Push Backend
                    sh "docker build -t your-dockerhub-user/backend:latest ./backend"
                    sh "docker push your-dockerhub-user/backend:latest"
                    
                    // Build & Push Frontend
                    sh "docker build -t your-dockerhub-user/frontend:latest ./frontend"
                    sh "docker push your-dockerhub-user/frontend:latest"
                }
            }
        }

        stage('Deploy Locally') {
            steps {
                script {
                    // 1. Ensure the directory exists and Jenkins owns it
                    // These two lines require Jenkins to have NOPASSWD sudo access
                    sh "sudo mkdir -p ${DEPLOY_PATH}"
                    sh "sudo chown -R jenkins:jenkins ${DEPLOY_PATH}"
                    
                    // 2. Handle secrets safely
                    withCredentials([file(credentialsId: 'app-env', variable: 'SECRET_FILE')]) {
                        // Use string concatenation for the variable to avoid the Groovy interpolation warning
                        sh 'cp ' + SECRET_FILE + ' ' + DEPLOY_PATH + '/.env'
                    }
                    
                    // 3. Copy Compose file
                    sh "cp docker-compose.yml ${DEPLOY_PATH}/docker-compose.yml"
                    
                    // 4. Deploy using absolute path to avoid @tmp issues
                    // We change the working directory within the shell command itself
                    sh "cd ${DEPLOY_PATH} && docker-compose pull && docker-compose up -d"
                }
            }
        }
    }

    post {
        always {
            // Clean up unused images to save disk space
            sh 'docker image prune -f'
            cleanWs()
        }
        success {
            echo 'Deployment successful!'
        }
        failure {
            echo 'Deployment failed. Check logs for permission or syntax errors.'
        }
    }
}