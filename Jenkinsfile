pipeline {
    agent any

    environment {
        REGISTRY        = "docker.io/prabal2611"
        REGISTRY_CREDS  = 'docker-registry-credentials' 
        
        BACKEND_IMAGE   = "${REGISTRY}/book-saas-backend"
        FRONTEND_IMAGE  = "${REGISTRY}/book-saas-frontend"
        
        // Secret File credential ID
        APP_ENV_FILE    = credentials('book-saas-env-file') 
        DEPLOY_DIR      = "/opt/book-saas"
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
        ansiColor('xterm')
    }

    stages {
        stage('Initialize') {
            steps {
                sh "sudo mkdir -p ${DEPLOY_DIR}"
                sh "sudo chown jenkins:jenkins ${DEPLOY_DIR}"
            }
        }

        stage('Build Backend') {
            steps {
                echo "Building Backend..."
                // Limit memory usage during build to keep t3.micro stable
                sh "docker build --memory=512m -t ${BACKEND_IMAGE}:latest ./backend"
            }
        }

        stage('Build Frontend') {
            steps {
                echo "Building Frontend..."
                // Frontend builds (npm run build) are memory intensive
                sh "docker build --memory=800m -t ${FRONTEND_IMAGE}:latest ./frontend"
            }
        }

        stage('Push to Docker Hub') {
            steps {
                script {
                    withCredentials([usernamePassword(credentialsId: "${env.REGISTRY_CREDS}", passwordVariable: 'PASS', usernameVariable: 'USER')]) {
                        sh 'echo "$PASS" | docker login -u "$USER" --password-stdin'
                        sh "docker push ${BACKEND_IMAGE}:latest"
                        sh "docker push ${FRONTEND_IMAGE}:latest"
                    }
                }
            }
        }

        stage('Deploy') {
            steps {
                script {
                    echo "Deploying to ${DEPLOY_DIR}..."
                    // Securely copy the environment file
                    sh "sudo cp ${APP_ENV_FILE} ${DEPLOY_DIR}/.env"
                    sh "cp docker-compose.yml ${DEPLOY_DIR}/docker-compose.yml"
                    
                    dir(DEPLOY_DIR) {
                        // Force pull new images and restart
                        sh "docker compose pull"
                        sh "docker compose up -d --remove-orphans"
                    }
                }
            }
        }
    }

    post {
        success {
            echo "Deployment successful!"
        }
        always {
            echo "Cleaning up dangling images..."
            // Removes only unused layers to save disk space
            sh "docker image prune -f"
            cleanWs()
        }
    }
}