// File: Jenkinsfile
// Description: CI/CD pipeline with Docker build/push to DockerHub (fixed tag) and Kubernetes deploy using Rancher kubeconfig

pipeline {
    agent any

    options { timestamps() }

    environment {
        // Split repo and tag so we don't append timestamps
        IMAGE_NAME = 'ksanthosh200/swe645-site'
        IMAGE_TAG  = '1.0'       // <--- fixed tag you asked for
        // Kubernetes targets (adjust if your names differ)
        K8S_NAMESPACE  = 'default'
        K8S_DEPLOYMENT = 'deployment'
        K8S_CONTAINER  = 'container-0'
    }

    stages {
        stage('Checkout Code') {
            steps {
                checkout scm
                sh 'echo "Building image: ${IMAGE_NAME}:${IMAGE_TAG}"'
            }
        }

        stage('Docker Build & Push (fixed tag)') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'docker-credentials',  // Jenkins credential ID
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh '''
                        set -euo pipefail

                        # Login (masked in Jenkins logs)
                        echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin

                        # Build image with fixed tag
                        docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .

                        # Also tag as latest (optional but common)
                        docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${IMAGE_NAME}:latest

                        # Push both tags
                        docker push ${IMAGE_NAME}:${IMAGE_TAG}
                        docker push ${IMAGE_NAME}:latest
                    '''
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                withCredentials([file(credentialsId: 'kubeconfig', variable: 'KUBECONFIG_FILE')]) {
                    sh '''
                        set -euo pipefail
                        export KUBECONFIG="$KUBECONFIG_FILE"

                        # Show context
                        kubectl config current-context

                        # Roll out the fixed tag
                        kubectl set image deployment/${K8S_DEPLOYMENT} ${K8S_CONTAINER}=${IMAGE_NAME}:${IMAGE_TAG} -n ${K8S_NAMESPACE}

                        # Wait for rollout
                        kubectl rollout status deployment/${K8S_DEPLOYMENT} -n ${K8S_NAMESPACE} --timeout=180s
                    '''
                }
            }
        }
    }

    post {
        always {
            sh 'docker logout || true'
            echo 'Pipeline finished.'
        }
        success {
            echo "✅ Deployment Successful: ${IMAGE_NAME}:${IMAGE_TAG}"
        }
        failure {
            echo '❌ Deployment Failed. See logs above.'
        }
    }
}
