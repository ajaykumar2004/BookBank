import React, { useState } from 'react';
import './App.css';

function App() {
  const [bookName, setBookName] = useState('');
  const [userbook, setuserbook] = useState(null);
  const [userbookname, setuserbookname] = useState('');

  const handleInputChange = (e) => {
    setBookName(e.target.value);
  };
  const handleFileChange = (e) => {
    setuserbook(e.target.files[0]);
  };
  const handleUserBookName = (e)=>{
    setuserbookname(e.target.value);
  }
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Book Name:', bookName);
    try {
      const response = await fetch('https://book-bank-one.vercel.app/book' , {
          method  : 'POST' ,
          headers : {
            'Content-Type':' application/json ',
          },
          body : JSON.stringify({name : bookName}),
      });

      if(response.ok){
          const blob= await response.blob();
          const url=URL.createObjectURL(blob);

          const link=document.createElement('a');
          link.href=url;
          link.download=`${bookName}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
      }
      else{
        alert(`${bookName} not found`);
        console.error('Failed to send book name');
      }
    } catch (error) {
        console.log("Error");
    }

  };

  const publish = async (e) => {
    e.preventDefault();

    try {
      const formData = new FormData();
      formData.append('bookname', userbookname);
      formData.append('book', userbook);
      console.log(formData);
      const response = await fetch('https://book-bank-one.vercel.app/publish', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        console.log('Successfully published your book');
      } else {
        console.log('Could not save the book to the database');
      }
    } catch (error) {
      console.error('Could not send the book:', error.message);
    }
  };
  
  return (
    <div className="App">
      <h1>Welcome to Book bank</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="bookName">Enter book name : </label>
        <input
          type="text" id="bookName" value={bookName} onChange={handleInputChange}/>
        <br />
        <button type="submit">Submit</button>
      </form>
      <form onSubmit={publish}>
        <label htmlFor="userbookname">Enter the name of your book : </label>
        <input type="text" onChange={handleUserBookName}/>
        <br />
        <label htmlFor="">Upload your book</label><br />
        <input type="file" onChange={handleFileChange} /><br />
        <button type='submit' >Publish</button>
      </form>
    </div>
  );
}

export default App;
