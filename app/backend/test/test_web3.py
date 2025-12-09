from web3 import Web3

w3 = Web3(Web3.HTTPProvider("http://YOUR_DB_HOST:8545"))

print(w3.is_connected())

print(w3.eth.block_number)
accounts = w3.eth.accounts
print(accounts)

print(w3.eth.get_balance("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"))