function loadComments () {
  var commentsUrl = '/read/list-comments/' + documentKey;
  
  $('#comments-content').load(commentsUrl);
}

$(document).ready(function () {
  // Handle posting comments.
  $(document).on('click', '#send-comment', function (event) {
    var commentText = $('#comment-text').val();

    $.post('/read/add-comment/' + documentKey,
           { comment : commentText },
           function (data) {
             $('#comment-text').val('');
           })
      .fail(function (err) {
        alert("Couldn't post comment. Are you logged in?");
      })
      .always(function () {
        loadComments();
      });

  });

  $(document).on('click', '#comments-reload', function (event) {
    loadComments();
  });
  
  loadComments();
});
