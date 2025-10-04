/* SWE645 Assignment 1 - script.js
   Purpose: Client-side validation and raffle check
*/
(function(){
  const form = document.getElementById('survey-form');
  if(!form) return;

  function parseRaffle(input){
    return input
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => Number(s))
      .filter(n => Number.isInteger(n));
  }

  function validateRaffleField(){
    const raffle = document.getElementById('raffle');
    const err = document.getElementById('raffleError');
    const numbers = parseRaffle(raffle.value);
    const validCount = numbers.length >= 10;
    const inRange = numbers.every(n => n >= 1 && n <= 100);
    const ok = validCount && inRange;

    if(!ok){
      raffle.setCustomValidity('Invalid');
      err.style.display = 'block';
    } else {
      raffle.setCustomValidity('');
      err.style.display = 'none';
    }
    return ok;
  }

  function validateInterest(){
    const radios = document.querySelectorAll('input[name="interest"]');
    const err = document.getElementById('interestError');
    const checked = Array.from(radios).some(r => r.checked);
    err.style.display = checked ? 'none' : 'block';
    return checked;
  }

  document.getElementById('raffle').addEventListener('input', validateRaffleField);
  form.addEventListener('change', function(e){
    if(e.target && e.target.name === 'interest') validateInterest();
  });

  form.addEventListener('submit', function(e){
    e.preventDefault();

    // Bootstrap validation classes
    form.classList.add('was-validated');

    // Custom validations
    const okRaffle = validateRaffleField();
    const okInterest = validateInterest();

    if(!form.checkValidity() || !okRaffle || !okInterest){
      e.stopPropagation();
      form.reportValidity();
      return;
    }

    // Simple raffle: draw a number 1..100; if user list includes it -> win
    const drawn = Math.floor(Math.random() * 100) + 1;
    const userNums = parseRaffle(document.getElementById('raffle').value);
    const win = userNums.includes(drawn);

    const msg = win
      ? `🎉 You WIN a free movie ticket! Drawn number: ${drawn}.`
      : `Thanks for submitting! Drawn number: ${drawn}. Unfortunately not a winner this time.`;

    alert(msg);
    form.reset();
    form.classList.remove('was-validated');
    document.getElementById('interestError').style.display = 'none';
    document.getElementById('raffleError').style.display = 'none';
  });
})();
