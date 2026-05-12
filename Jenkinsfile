pipeline {
    agent any

    environment {
        REGISTRY        = "docker.io/prabal2611"
        REGISTRY_CREDS  = 'docker-registry-credentials' 
        
        BACKEND_IMAGE   = "${REGISTRY}/book-saas-backend"
        FRONTEND_IMAGE  = "${REGISTRY}/book-saas-frontend"
        
        // Credentials for the .env file (Secret File type)
        APP_ENV_FILE    = credentials('book-saas-env-file') 
    }

    stages {
        stage('Checkout Code') {
            steps {
                checkout scm
            }
        }

        stage('Build Images') {
            parallel {
                stage('Build Backend') {
                    steps {
                        sh "docker build -t ${BACKEND_IMAGE}:latest ./backend"
                    }
                }
                stage('Build Frontend') {
                    steps {
                        sh "docker build -t ${FRONTEND_IMAGE}:latest ./frontend"
                    }
                }
            }
        }

        stage('Push to Registry') {
            steps {
                script {
                    withCredentials([usernamePassword(credentialsId: "${env.REGISTRY_CREDS}", passwordVariable: 'PASS', usernameVariable: 'USER')]) {
                        // Using single quotes for the sh command to securely handle credentials
                        sh 'echo "$PASS" | docker login -u "$USER" --password-stdin'
                        sh "docker push ${BACKEND_IMAGE}:latest"
                        sh "docker push ${FRONTEND_IMAGE}:latest"
                    }
                }
            }
        }

        stage('Deploy Locally') {
            steps {
                script {
                    // Create the directory if it doesn't exist
                    sh "sudo mkdir -p /opt/book-saas"
                    
                    // Fix Permission Denied: Use sudo to copy the secret file path to the destination
                    // Single quotes here prevent the 'Insecure Interpolation' warning
                    sh 'sudo cp $APP_ENV_FILE /opt/book-saas/.env'
                    sh "sudo cp docker-compose.yml /opt/book-saas/docker-compose.yml"

                    // Ensure the jenkins user owns the folder and files for the docker compose command
                    sh "sudo chown -R jenkins:jenkins /opt/book-saas"

                    dir('/opt/book-saas') {
                        // Restart the services
                        sh "docker compose down --remove-orphans || true"
                        sh "docker compose up -d"
                    }
                }
            }
        }
    }

    post {
        always {
            // Cleanup to save disk space
            sh "docker image prune -f"
            cleanWs()
        }
    }
}