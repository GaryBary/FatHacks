// App.tsx
import React, { useState } from 'react';
import './styles.css';

interface Friend {
  id: number;
  name: string;
}

interface Expense {
  id: number;
  description: string;
  amount: number;
  paidBy: number;
  splits: { [key: number]: number };
}

interface Settlement {
  from: number;
  to: number;
  amount: number;
}

function App() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [newFriend, setNewFriend] = useState('');
  const [activeTab, setActiveTab] = useState('friends');
  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: '',
    paidBy: '',
    splits: {} as { [key: number]: string }
  });

  const handleAddFriend = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFriend.trim()) {
      setFriends([...friends, { name: newFriend.trim(), id: Date.now() }]);
      setNewFriend('');
    }
  };

  const handleRemoveFriend = (id: number) => {
    setFriends(friends.filter(friend => friend.id !== id));
    setExpenses(expenses.filter(expense => expense.paidBy !== id));
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(newExpense.amount);
    const paidBy = parseInt(newExpense.paidBy);
    
    if (amount && newExpense.description && paidBy) {
      const splits = Object.entries(newExpense.splits).reduce((acc, [id, value]) => {
        acc[parseInt(id)] = parseFloat(value) || 0;
        return acc;
      }, {} as { [key: number]: number });

      const totalSplit = Object.values(splits).reduce((sum, val) => sum + val, 0);
      
      if (Math.abs(totalSplit - 100) < 0.01) {
        setExpenses([...expenses, {
          id: Date.now(),
          amount,
          description: newExpense.description,
          paidBy,
          splits
        }]);
        setNewExpense({
          description: '',
          amount: '',
          paidBy: '',
          splits: {}
        });
      } else {
        alert('Split percentages must total 100%');
      }
    }
  };

  const calculateSettlements = (): Settlement[] => {
    const balances: { [key: number]: number } = {};
    friends.forEach(friend => {
      balances[friend.id] = 0;
    });

    expenses.forEach(expense => {
      balances[expense.paidBy] += expense.amount;
      Object.entries(expense.splits).forEach(([friendId, percentage]) => {
        balances[parseInt(friendId)] -= (expense.amount * percentage / 100);
      });
    });

    const settlements: Settlement[] = [];
    const debtors = Object.entries(balances)
      .filter(([_, balance]) => balance < 0)
      .sort((a, b) => a[1] - b[1]);
    const creditors = Object.entries(balances)
      .filter(([_, balance]) => balance > 0)
      .sort((a, b) => b[1] - a[1]);

    while (debtors.length > 0 && creditors.length > 0) {
      const [debtorId, debtorBalance] = debtors[0];
      const [creditorId, creditorBalance] = creditors[0];
      
      const amount = Math.min(-debtorBalance, creditorBalance);
      
      settlements.push({
        from: parseInt(debtorId),
        to: parseInt(creditorId),
        amount: Math.round(amount * 100) / 100
      });

      if (-debtorBalance === amount) debtors.shift();
      if (creditorBalance === amount) creditors.shift();
      
      if (debtors.length) debtors[0][1] += amount;
      if (creditors.length) creditors[0][1] -= amount;
    }

    return settlements;
  };

  return (
    <div className="container">
      <h1>Fat Hacks Party Payback App</h1>

      <div className="tabs">
        <button 
          className={activeTab === 'friends' ? 'active' : ''} 
          onClick={() => setActiveTab('friends')}
        >
          Friends
        </button>
        <button 
          className={activeTab === 'expenses' ? 'active' : ''} 
          onClick={() => setActiveTab('expenses')}
        >
          Expenses
        </button>
        <button 
          className={activeTab === 'settlements' ? 'active' : ''} 
          onClick={() => setActiveTab('settlements')}
        >
          Settlements
        </button>
      </div>

      {activeTab === 'friends' && (
        <div className="section">
          <h2>Manage Friends</h2>
          <form onSubmit={handleAddFriend}>
            <input
              type="text"
              value={newFriend}
              onChange={(e) => setNewFriend(e.target.value)}
              placeholder="Enter friend's name"
            />
            <button type="submit">Add Friend</button>
          </form>

          <div className="friends-list">
            {friends.map(friend => (
              <div key={friend.id} className="friend-item">
                <span>{friend.name}</span>
                <button onClick={() => handleRemoveFriend(friend.id)}>Remove</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'expenses' && (
        <div className="section">
          <h2>Add Expense</h2>
          {friends.length < 2 ? (
            <div className="alert">Add at least two friends first!</div>
          ) : (
            <form onSubmit={handleAddExpense}>
              <input
                type="text"
                value={newExpense.description}
                onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                placeholder="Expense description"
                required
              />
              <input
                type="number"
                value={newExpense.amount}
                onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                placeholder="Amount"
                step="0.01"
                required
              />
              <select
                value={newExpense.paidBy}
                onChange={(e) => setNewExpense({...newExpense, paidBy: e.target.value})}
                required
              >
                <option value="">Who paid?</option>
                {friends.map(friend => (
                  <option key={friend.id} value={friend.id}>
                    {friend.name}
                  </option>
                ))}
              </select>

              <h3>Split Percentages</h3>
              {friends.map(friend => (
                <div key={friend.id} className="split-input">
                  <label>{friend.name}</label>
                  <input
                    type="number"
                    value={newExpense.splits[friend.id] || ''}
                    onChange={(e) => setNewExpense({
                      ...newExpense,
                      splits: {...newExpense.splits, [friend.id]: e.target.value}
                    })}
                    placeholder="0"
                    min="0"
                    max="100"
                    step="0.1"
                    required
                  />
                  <span>%</span>
                </div>
              ))}
              <button type="submit">Add Expense</button>
            </form>
          )}

          <div className="expenses-list">
            <h3>Expense History</h3>
            {expenses.map(expense => (
              <div key={expense.id} className="expense-item">
                <div className="expense-header">
                  {expense.description} - ${expense.amount.toFixed(2)}
                </div>
                <div className="expense-details">
                  Paid by: {friends.find(f => f.id === expense.paidBy)?.name}
                </div>
                <div className="expense-splits">
                  Split: {Object.entries(expense.splits).map(([friendId, percentage]) => (
                    `${friends.find(f => f.id === parseInt(friendId))?.name} (${percentage}%)`
                  )).join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'settlements' && (
        <div className="section">
          <h2>Settlements</h2>
          {calculateSettlements().map((settlement, index) => (
            <div key={index} className="settlement-item">
              <strong>{friends.find(f => f.id === settlement.from)?.name}</strong>
              {' owes '}
              <strong>${settlement.amount.toFixed(2)}</strong>
              {' to '}
              <strong>{friends.find(f => f.id === settlement.to)?.name}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;