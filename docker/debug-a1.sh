CHAIN_DIR="/Users/apasha/projects/push"
DOC_DIR="/Users/apasha/projects/push/push-vnode/docker"

  
    cd ${CHAIN_DIR}/push-anode

    set -o allexport 
    source ${DOC_DIR}/.env 
    source ${DOC_DIR}/common.env 
    source ${DOC_DIR}/a-specific.env 
    set +o allexport 

    export DB_NAME=anode1
    export PORT=5001
    export CONFIG_DIR=${DOC_DIR}/a1

    export LOG_DIR=${CONFIG_DIR}/log
    export ABI_DIR=${DOC_DIR}/_abi
    export ETH_KEY_PATH=${CONFIG_DIR}/node_key.json
    export LOCALH=true 
    #export SKIP_MIGRATIONS=true    
    export PG_HOST=localhost
    export PG_PORT=${EXTERNAL_PG_PORT}
    export REDIS_URL=redis://localhost:${EXTERNAL_REDIS_PORT}
    export VALIDATOR_RPC_ENDPOINT=http://localhost:8545
    export DATABASE_URL="postgres://${PG_USER}:${PG_PASS}@${PG_HOST}:${PG_PORT}/${DB_NAME}"

    echo  > ${LOG_DIR}/debug.log
    echo  > ${LOG_DIR}/error.log
    echo "db is ${DATABASE_URL}"
    npm run start:dev
