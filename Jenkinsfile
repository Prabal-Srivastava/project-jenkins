pipeline {
    agent any

    environment {
        REGISTRY          = "docker.io/prabal2611"
        // MATCHED TO YOUR LOG ERROR: "docker-registry-credentials"
        REGISTRY_CREDS    = 'docker-registry-credentials' 
        
        BACKEND_IMAGE     = "${REGISTRY}/book-saas-backend"
        FRONTEND_IMAGE    = "${REGISTRY}/book-saas-frontend"
        
        // This must exist in Jenkins as a 'Secret File'
        APP_ENV_FILE      = credentials('book-saas-env-file') 
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
                        sh "echo \$PASS | docker login -u \$USER --password-stdin"
                        sh "docker push ${BACKEND_IMAGE}:latest"
                        sh "docker push ${FRONTEND_IMAGE}:latest"
                    }
                }
            }
        }

        stage('Deploy Locally') {
            steps {
                script {
                    // Ensure the deploy directory exists
                    sh "sudo mkdir -p /opt/book-saas"
                    sh "sudo chown -R jenkins:jenkins /opt/book-saas"

                    // Copy env and compose files
                    sh "cp ${APP_ENV_FILE} /opt/book-saas/.env"
                    sh "cp docker-compose.yml /opt/book-saas/docker-compose.yml"

                    dir('/opt/book-saas') {
                        // Restart the services
                        sh "docker compose down || true"
                        sh "docker compose up -d"
                    }
                }
            }
        }
    }

    post {
        always {
            sh "docker image prune -f"
            cleanWs()
        }
    }
}