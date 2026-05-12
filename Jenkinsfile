pipeline {
    agent any

    environment {
        // Change username to your actual Docker Hub username if different
        REGISTRY          = "docker.io/prabal2611"
        REGISTRY_CREDS    = '' 
        
        BACKEND_IMAGE     = "${REGISTRY}/book-saas-backend"
        FRONTEND_IMAGE    = "${REGISTRY}/book-saas-frontend"
        
        // This is the Secret File credential you created in Jenkins
        APP_ENV_FILE      = credentials('book-saas-env-file') 
    }

    stages {
        stage('Checkout Code') {
            steps {
                // Use 'checkout scm' to automatically pull the branch that triggered the build
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
                // Log in using the Username/Password credential ID 'docker-registry-credentials'
                withCredentials([usernamePassword(credentialsId: "${env.REGISTRY_CREDS}", passwordVariable: 'PASS', usernameVariable: 'USER')]) {
                    sh "echo \$PASS | docker login -u \$USER --password-stdin"
                    sh "docker push ${BACKEND_IMAGE}:latest"
                    sh "docker push ${FRONTEND_IMAGE}:latest"
                }
            }
        }

        stage('Deploy Locally') {
            steps {
                script {
                    // 1. Create the app directory if it doesn't exist
                    sh "sudo mkdir -p /opt/book-saas"
                    sh "sudo chown -R jenkins:jenkins /opt/book-saas"

                    // 2. Copy the secret .env file and the docker-compose to the app folder
                    sh "cp ${APP_ENV_FILE} /opt/book-saas/.env"
                    sh "cp docker-compose.yml /opt/book-saas/docker-compose.yml"

                    // 3. Run Docker Compose
                    dir('/opt/book-saas') {
                        sh "docker compose down"
                        sh "docker compose up -d"
                    }
                }
            }
        }
    }

    post {
        always {
            // Clean up to save space on your t2.micro
            sh "docker image prune -f"
            cleanWs()
        }
    }
}
