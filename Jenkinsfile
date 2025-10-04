pipeline {
  agent any

  options {
    timestamps()
  }

  triggers {
    // Poll Git every minute (you can change this later)
    pollSCM('* * * * *')
  }

  environment {
    IMAGE_NAME      = "swe645-site"          // local image name
    IMAGE_TAG       = "latest"               // tag for the image
    CONTAINER_NAME  = "swe645-site"
    CONTAINER_PORT  = "80"                   // container port (Nginx)
    HOST_PORT       = "8081"                 // host port to expose (not 80 to avoid Jenkins conflict)
    // If you want to push to Docker Hub later:
    // DOCKERHUB_USER = "ksanthosh200"
    // REGISTRY_CRED  = "dockerhub-creds"    // Jenkins Credentials ID (username + PAT/password)
  }

  stages {
    stage('Checkout') {
      steps {
        // Adjust the repo URL/branch if needed
        git branch: 'main',
            url: 'https://github.com/KSANTHOSH200/swe645_proj1.git'
      }
    }

    stage('Build Docker Image') {
      steps {
        sh '''
          set -e
          echo "Building image ${IMAGE_NAME}:${IMAGE_TAG} ..."
          docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .
          docker image ls ${IMAGE_NAME}
        '''
      }
    }

    stage('Smoke Test (container locally)') {
      steps {
        sh '''
          set -e
          # Run a quick ephemeral container to sanity-check that / returns 200
          echo "Starting ephemeral container for smoke test..."
          CID=$(docker run -d -p 0:80 --name ${CONTAINER_NAME}-smoke ${IMAGE_NAME}:${IMAGE_TAG})
          # Find the random host port Docker allocated
          PORT=$(docker inspect -f '{{ (index (index .NetworkSettings.Ports "80/tcp") 0).HostPort }}' $CID)
          echo "Ephemeral container on host port: $PORT"
          # Try a few times in case Nginx needs a second to boot
          for i in 1 2 3 4 5; do
            if curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${PORT}/" | grep -qE '200|301|302'; then
              echo "Smoke test passed."
              break
            fi
            echo "Waiting for container... attempt $i"
            sleep 2
          done
          # Clean up the ephemeral container
          docker rm -f $CID
        '''
      }
    }

    stage('Deploy (replace running container)') {
      steps {
        sh '''
          set -e
          echo "Stopping old container if exists..."
          docker stop ${CONTAINER_NAME} || true
          docker rm ${CONTAINER_NAME} || true

          echo "Starting new container on port ${HOST_PORT}..."
          docker run -d \
            --name ${CONTAINER_NAME} \
            -p ${HOST_PORT}:${CONTAINER_PORT} \
            ${IMAGE_NAME}:${IMAGE_TAG}

          echo "New container status:"
          docker ps --filter "name=${CONTAINER_NAME}"
        '''
      }
    }

    // OPTIONAL: Push to Docker Hub (uncomment when you’re ready)
    // stage('Push to Docker Hub') {
    //   steps {
    //     script {
    //       docker.withRegistry('https://index.docker.io/v1/', env.REGISTRY_CRED) {
    //         sh """
    //           set -e
    //           docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${DOCKERHUB_USER}/${IMAGE_NAME}:${IMAGE_TAG}
    //           docker push ${DOCKERHUB_USER}/${IMAGE_NAME}:${IMAGE_TAG}
    //         """
    //       }
    //     }
    //   }
    // }
  }

  post {
    always {
      echo 'Pipeline completed.'
    }
  }
}
