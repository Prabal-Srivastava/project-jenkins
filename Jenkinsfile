pipeline {
    agent any

    environment {
        // Docker Hub details
        REGISTRY          = "docker.io/prabal2611"
        // Ensure this ID matches the ID in Manage Jenkins > Credentials EXACTLY
        REGISTRY_CREDS    = 'docker-hub-credentials' 
        
        BACKEND_IMAGE     = "${REGISTRY}/book-saas-backend"
        FRONTEND_IMAGE    = "${REGISTRY}/book-saas-frontend"
        
        // Credentials ID for your secret .env file
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
                        // Using --pull to ensure we have the latest base images
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
                // Fixed the variable reference and credential mapping
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
                    // 1. Prepare the deployment directory
                    sh "sudo mkdir -p /opt/book-saas"
                    sh "sudo chown -R jenkins:jenkins /opt/book-saas"

                    // 2. Copy necessary files
                    // ${APP_ENV_FILE} is the temporary path provided by Jenkins for your secret file
                    sh "cp ${APP_ENV_FILE} /opt/book-saas/.env"
                    sh "cp docker-compose.yml /opt/book-saas/docker-compose.yml"

                    // 3. Launch the application
                    dir('/opt/book-saas') {
                        sh "docker compose pull" // Pull fresh images if they were updated
                        sh "docker compose up -d --remove-orphans"
                    }
                }
            }
        }
    }

    post {
        always {
            // Clean up dangling images to prevent disk space issues on t2.micro
            sh "docker image prune -f"
            cleanWs()
        }
        success {
            echo "Deployment successful! App is running at /opt/book-saas"
        }
        failure {
            echo "Pipeline failed. Check the logs for credential or RAM issues."
        }
    }
}