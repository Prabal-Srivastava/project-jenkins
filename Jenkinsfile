pipeline {
    agent any

    environment {
        REGISTRY        = "docker.io/prabal2611"
        // Credentials ID for Docker Hub (Username/Password type)
        REGISTRY_CREDS  = 'docker-registry-credentials' 
        
        BACKEND_IMAGE   = "${REGISTRY}/book-saas-backend"
        FRONTEND_IMAGE  = "${REGISTRY}/book-saas-frontend"
        
        // Credentials ID for the .env file (Secret File type)
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
                    // Using the helper to inject credentials directly
                    withCredentials([usernamePassword(credentialsId: "${REGISTRY_CREDS}", passwordVariable: 'PASS', usernameVariable: 'USER')]) {
                        sh "echo '${PASS}' | docker login -u '${USER}' --password-stdin"
                        sh "docker push ${BACKEND_IMAGE}:latest"
                        sh "docker push ${FRONTEND_IMAGE}:latest"
                    }
                }
            }
        }

        stage('Deploy Locally') {
            steps {
                script {
                    // Create directory and set permissions
                    sh "sudo mkdir -p /opt/book-saas"
                    sh "sudo chown -R jenkins:jenkins /opt/book-saas"

                    // Use the APP_ENV_FILE path provided by the credentials helper
                    sh "cp ${APP_ENV_FILE} /opt/book-saas/.env"
                    sh "cp docker-compose.yml /opt/book-saas/docker-compose.yml"

                    dir('/opt/book-saas') {
                        // Restart the services. Using 'docker-compose' or 'docker compose' 
                        // depending on your installed version.
                        sh "docker compose down --remove-orphans || true"
                        sh "docker compose up -d"
                    }
                }
            }
        }
    }

    post {
        always {
            // Clean up dangling images to save disk space
            sh "docker image prune -f"
            cleanWs()
        }
    }
}