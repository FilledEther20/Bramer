import struct
import socket
import random
import time


"""
Steps:
1)DNS Message format construct
2)Send this to a server and get the response out
3)Parse the response and cache it in ttl
"""



"""
DNS packet header ===> transactionID+flags+qdcount+ancount+nscount+arcount      (6*2=>12)
"""

cache={} #To store 
def query_builder(dom):
    tid=random.randint(0,pow(2,16)-1)
    flag=0x0100
    qdcount=1 # only 1 question at present
    header=struct.pack(">HHHHHH",tid,flag,qdcount,0,0,0)
    query=b''
    for p in dom.split('.'):
        query+=struct.pack('B',len(p))+p.encode()
    query += b'\x00'  # End of domain
    query += struct.pack(">HH", 1, 1)  # QTYPE=A, QCLASS=IN

    return tid, header + query

def response_parser(response, tid):
    recv_tid = struct.unpack(">H", response[:2])[0]
    if recv_tid != tid:
        raise Exception("Transaction ID mismatch")
    print(recv_tid)

    qdcount = struct.unpack(">H", response[4:6])[0]
    ancount = struct.unpack(">H", response[6:8])[0]

    offset = 12  # Start after header

    # Skip question section
    for _ in range(qdcount):
        while response[offset] != 0:
            offset += response[offset] + 1
        offset += 5  # skip null + QTYPE + QCLASS

    # Parse the first answer
    if ancount == 0:
        return None, None

    offset += 2  # skip name pointer (usually 0xc0..)
    rtype, rclass, ttl, rdlength = struct.unpack(">HHIH", response[offset:offset+10])
    offset += 10
    ip = struct.unpack(">BBBB", response[offset:offset+4])
    ip_address = ".".join(map(str, ip))

    return ip_address,ttl
    
    
def resolver(dom):
    if dom in cache:
        ip_address,expires_at=cache[dom]['ip'],cache[dom]['expires_at']
        # The current time if less than the expiry time of domain then we can directly return this ip
        if time.time()<expires_at:
            print("In cache")
            return ip_address
        else:
            del cache[dom] # if already expired then no point in keeping it
    
    tid,query=query_builder(dom)
    
    s=socket.socket(socket.AF_INET,socket.SOCK_DGRAM) # INET==>IPv4 
    s.settimeout(3)
    s.sendto(query, ("8.8.8.8", 53)) #send it to google (considered here)
    res,_ = s.recvfrom(512) # receive response
    s.close()
    
    ip_address,ttl=response_parser(res,tid)
    
    #Store in cache
    if ip_address:
        cache[dom] = {
            'ip': ip_address,
            'expires_at': time.time() + ttl
        }

    return ip_address
            


domain = "google.com"
print(f"{domain} → {resolver(domain)}")
time.sleep(1)
print(f"{domain} → {resolver(domain)}") 