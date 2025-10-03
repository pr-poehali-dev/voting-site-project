import json
import os
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: API для работы с голосованиями - получение списка, голосование
    Args: event с httpMethod, body, queryStringParameters; context с request_id
    Returns: HTTP response с данными голосований или результатом голосования
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    db_url = os.environ.get('DATABASE_URL')
    if not db_url:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Database connection not configured'})
        }
    
    conn = psycopg2.connect(db_url, cursor_factory=RealDictCursor)
    cur = conn.cursor()
    
    if method == 'GET':
        cur.execute('''
            SELECT p.id, p.title, p.description, p.status, p.created_at,
                   u.name as creator_name, u.email as creator_email
            FROM polls p
            JOIN users u ON p.created_by = u.id
            WHERE p.status = 'active'
            ORDER BY p.created_at DESC
        ''')
        polls = cur.fetchall()
        
        result = []
        for poll in polls:
            cur.execute('''
                SELECT id, option_text, votes_count
                FROM poll_options
                WHERE poll_id = %s
                ORDER BY id
            ''', (poll['id'],))
            options = cur.fetchall()
            
            total_votes = sum(opt['votes_count'] for opt in options)
            
            result.append({
                'id': poll['id'],
                'title': poll['title'],
                'description': poll['description'],
                'status': poll['status'],
                'creator': poll['creator_name'],
                'options': [dict(o) for o in options],
                'totalVotes': total_votes
            })
        
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'isBase64Encoded': False,
            'body': json.dumps(result)
        }
    
    if method == 'POST':
        body_data = json.loads(event.get('body', '{}'))
        poll_id = body_data.get('poll_id')
        option_id = body_data.get('option_id')
        user_id = body_data.get('user_id', 1)
        
        if not poll_id or not option_id:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'poll_id and option_id are required'})
            }
        
        cur.execute('''
            SELECT id FROM users WHERE id = %s
        ''', (user_id,))
        user_exists = cur.fetchone()
        
        if not user_exists:
            cur.execute('''
                INSERT INTO users (id, email, name, role)
                VALUES (%s, %s, %s, %s)
            ''', (user_id, f'user{user_id}@example.com', f'User {user_id}', 'user'))
            conn.commit()
        
        cur.execute('''
            SELECT id FROM votes WHERE poll_id = %s AND user_id = %s
        ''', (poll_id, user_id))
        existing_vote = cur.fetchone()
        
        if existing_vote:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'User already voted in this poll'})
            }
        
        cur.execute('''
            INSERT INTO votes (poll_id, option_id, user_id)
            VALUES (%s, %s, %s)
        ''', (poll_id, option_id, user_id))
        
        cur.execute('''
            UPDATE poll_options
            SET votes_count = votes_count + 1
            WHERE id = %s
        ''', (option_id,))
        
        conn.commit()
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'isBase64Encoded': False,
            'body': json.dumps({'success': True, 'message': 'Vote recorded successfully'})
        }
    
    return {
        'statusCode': 405,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Method not allowed'})
    }