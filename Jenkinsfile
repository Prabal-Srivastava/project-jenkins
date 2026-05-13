pipeline {
    agent any

    environment {
        // Updated to match your Docker Compose image prefix
        REGISTRY        = "docker.io/p2511" 
        REGISTRY_CREDS  = 'docker-registry-credentials' 
        
        BACKEND_IMAGE   = "${REGISTRY}/book-saas-backend"
        FRONTEND_IMAGE  = "${REGISTRY}/book-saas-frontend"
        
        APP_ENV_FILE    = credentials('book-saas-env-file') 
        DEPLOY_DIR      = "/opt/book-saas"
    }

    options {
        timeout(time: 40, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    stages {
        stage('Cleanup Workspace') {
            steps {
                // Ensure the deployment directory exists and is clean for the new config
                sh "sudo mkdir -p ${DEPLOY_DIR}"
                sh "sudo chown jenkins:jenkins ${DEPLOY_DIR}"
            }
        }

        stage('Build Backend') {
            steps {
                sh "docker build --memory=512m -t ${BACKEND_IMAGE}:latest ./backend"
            }
        }

        stage('Build Frontend') {
            steps {
                // React/Vite builds can be heavy on t3.micro
                sh "docker build --memory=850m -t ${FRONTEND_IMAGE}:latest ./frontend"
            }
        }

        stage('Push & Deploy') {
            steps {
                script {
                    // Login and Push
                    withCredentials([usernamePassword(credentialsId: "${env.REGISTRY_CREDS}", passwordVariable: 'PASS', usernameVariable: 'USER')]) {
                        sh 'echo "$PASS" | docker login -u "$USER" --password-stdin'
                        sh "docker push ${BACKEND_IMAGE}:latest"
                        sh "docker push ${FRONTEND_IMAGE}:latest"
                    }

                    // Deploy
                    sh "sudo cp ${APP_ENV_FILE} ${DEPLOY_DIR}/.env"
                    sh "cp docker-compose.yml ${DEPLOY_DIR}/docker-compose.yml"
                    
                    dir(DEPLOY_DIR) {
                        // pull ensures we get the latest images we just pushed
                        sh "docker compose pull" 
                        sh "docker compose up -d --remove-orphans"
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