// File: Jenkinsfile
// Description: CI/CD pipeline with Docker build/push, Kubernetes deploy, and post actions

pipeline {
    agent any

    environment {
        // Jenkins credentials:
        // - docker-credentials: Username/Password for Docker Hub
        // - kubeconfig: Secret file credential containing your kubeconfig
        DOCKERHUB_CREDENTIALS = credentials('docker-credentials')
        KUBECONFIG_CREDENTIALS = credentials('kubeconfig')

        // Docker image coordinates (change if you use a different repo/name)
        DOCKER_IMAGE_REPO = 'ksanthosh200/swe645-site'

        // Timestamp tag (e.g., 20251003T051200)
        BUILD_TIMESTAMP = "${new Date().format('yyyyMMdd\'T\'HHmmss')}"
    }

    stages {
        stage('Build Survey Image') {
            steps {
                script {
                    // Pull source (repo must contain a Dockerfile at the project root)
                    checkout scm

                    // Show tag being built
                    sh 'echo "Building tag: ${BUILD_TIMESTAMP}"'

                    // Docker Hub login using Jenkins credentials
                    sh """
                      echo "${DOCKERHUB_CREDENTIALS_PSW}" | docker login -u "${DOCKERHUB_CREDENTIALS_USR}" --password-stdin
                    """

                    // Build image with timestamp tag and also tag as latest
                    sh """
                      docker build -t ${DOCKER_IMAGE_REPO}:${BUILD_TIMESTAMP} .
                      docker tag  ${DOCKER_IMAGE_REPO}:${BUILD_TIMESTAMP} ${DOCKER_IMAGE_REPO}:latest
                    """
                }
            }
        }

        stage('Push image to Docker Hub') {
            steps {
                sh """
                  docker push ${DOCKER_IMAGE_REPO}:${BUILD_TIMESTAMP}
                  docker push ${DOCKER_IMAGE_REPO}:latest
                """
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                // Use kubeconfig secret file as KUBECONFIG for kubectl
                withEnv(["KUBECONFIG=${KUBECONFIG_CREDENTIALS}"]) {
                    script {
                        // Update the running Deployment's container image
                        // NOTE:
                        //   - Deployment name: "deployment"  (from your cluster)
                        //   - Container name:  "container-0" (as shown in your workload)
                        //   - Namespace: "default" (adjust if different)
                        sh """
                          kubectl set image deployment/deployment container-0=${DOCKER_IMAGE_REPO}:${BUILD_TIMESTAMP} -n default
                          kubectl rollout status deployment/deployment -n default --timeout=180s
                        """
                    }
                }
            }
        }
    }

    post {
        success {
            echo "Deployment Successful: ${DOCKER_IMAGE_REPO}:${BUILD_TIMESTAMP}"
        }
        failure {
            echo "Deployment Failed. Check console output for details."
        }
        always {
            echo 'Cleaning Up ...'
            // Optional: Docker cleanup (uncomment if desired)
            // sh 'docker image prune -f || true'
        }
    }
}
